/**
 * In-memory stand-in for `sql` from "@/lib/db", backed by one `submissions`
 * table. It is deliberately strict: it only understands the query shapes the
 * application actually issues (listed below) and throws a descriptive error for
 * anything else, so a new or changed query can never silently "work" in tests
 * by hitting a permissive mock.
 *
 * Each statement runs atomically (like a real single-statement SQL command)
 * but is preceded by one awaited microtask tick, so statements issued by
 * concurrent callers genuinely interleave. That is what lets the lifecycle
 * tests prove the conditional-WHERE guards (status / paidAt / paidEmailSentAt)
 * hold under duplicate and concurrent deliveries.
 *
 * Supported statements (whitespace-insensitive):
 *   INSERT INTO submissions (type, data) VALUES ($1, $2) RETURNING id
 *   SELECT <data | id, type, data | id, type, data, created_at, read_at>
 *     FROM submissions [WHERE ...] [ORDER BY id | created_at DESC] [LIMIT n]
 *   UPDATE submissions SET <set> WHERE <where> [RETURNING id]
 *
 *   <set>   := data = data || $n::jsonb              (shallow jsonb merge)
 *            | data = data - 'key'                   (remove a key)
 *            | data = jsonb_set(data, '{key}', to_jsonb($n::text))
 *            | read_at = now()
 *   <where> := conditions joined by AND:
 *              id = $n | type = 'x' | read_at IS NULL
 *              data->>'k' = 'v' | data->>'k' IS [NOT] NULL
 *              (data->>'k')::timestamptz > now() - interval 'N days'
 *
 * jsonb semantics honoured: data is stored as parsed JSON (so `undefined`
 * fields vanish and Dates become strings), `->>` yields text or NULL (missing
 * key and JSON null are both NULL), `||` is a shallow merge.
 */

export interface StoredSubmission {
  id: number;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export interface LoggedQuery {
  /** Normalised statement text with $1.. placeholders. */
  text: string;
  values: unknown[];
}

const KNOWN_TYPES = new Set(["lead", "strategy_session", "payment_request", "merch_order"]);

type Predicate = (row: StoredSubmission) => boolean;

export class FakeSubmissionsDb {
  readonly rows = new Map<number, StoredSubmission>();
  readonly queries: LoggedQuery[] = [];
  private nextId = 1;
  private failures: { pattern: RegExp; error: Error; remaining: number }[] = [];

  /** `clock` supplies "now" for created_at, now() and interval comparisons. */
  constructor(private readonly clock: () => number = () => Date.now()) {}

  /** The drop-in replacement for `sql`: a tagged-template function. */
  readonly sql = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<unknown[]> => {
    const text = strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
      ""
    );
    const normalised = text.replace(/\s+/g, " ").trim();
    this.queries.push({ text: normalised, values });

    // Let concurrent callers interleave between statements (never inside one).
    await Promise.resolve();

    for (const failure of this.failures) {
      if (failure.remaining > 0 && failure.pattern.test(normalised)) {
        failure.remaining -= 1;
        throw failure.error;
      }
    }
    return this.execute(normalised, values);
  };

  // ---- test controls -------------------------------------------------------

  /** Makes the next `times` statements matching `pattern` throw (a DB outage). */
  failNext(pattern: RegExp, error = new Error("fake db: connection refused"), times = 1): void {
    this.failures.push({ pattern, error, remaining: times });
  }

  /** Inserts a row directly (for states that are awkward to reach through the app). */
  seed(type: string, data: Record<string, unknown>): number {
    return this.insert(type, JSON.stringify(data));
  }

  /** Current JSON data of a row; throws if the row does not exist. */
  data(id: number): Record<string, unknown> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`fake db: no submission with id ${id}`);
    return structuredClone(row.data);
  }

  /** Number of statements issued so far matching a pattern. */
  countQueries(pattern: RegExp): number {
    return this.queries.filter((q) => pattern.test(q.text)).length;
  }

  // ---- statement execution -------------------------------------------------

  private execute(text: string, values: unknown[]): unknown[] {
    let match: RegExpMatchArray | null;

    if (
      (match = text.match(
        /^INSERT INTO submissions \(type, data\) VALUES \(\$(\d+), \$(\d+)\) RETURNING id$/
      ))
    ) {
      const type = values[Number(match[1]) - 1];
      const json = values[Number(match[2]) - 1];
      if (typeof type !== "string" || !KNOWN_TYPES.has(type)) {
        throw new Error(`fake db: INSERT with unknown submission type ${JSON.stringify(type)}`);
      }
      if (typeof json !== "string") {
        throw new Error(
          "fake db: INSERT data parameter must be a JSON string (use JSON.stringify)"
        );
      }
      return [{ id: this.insert(type, json) }];
    }

    if (
      (match = text.match(
        /^SELECT (.+?) FROM submissions(?: WHERE (.+?))?(?: ORDER BY (.+?))?(?: LIMIT (\d+))?$/
      ))
    ) {
      const [, cols, where, order, limit] = match as unknown as (string | undefined)[];
      let rows = this.filter(where, values, text);
      if (order === "id") rows.sort((a, b) => a.id - b.id);
      else if (order === "created_at DESC") {
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
      } else if (order !== undefined) {
        throw new Error(`fake db: unsupported ORDER BY ${JSON.stringify(order)} in: ${text}`);
      }
      if (limit !== undefined) rows = rows.slice(0, Number(limit));

      switch (cols) {
        case "data":
          return rows.map((r) => ({ data: structuredClone(r.data) }));
        case "id, type, data":
          return rows.map((r) => ({ id: r.id, type: r.type, data: structuredClone(r.data) }));
        case "id, type, data, created_at, read_at":
          return rows.map((r) => ({
            id: r.id,
            type: r.type,
            data: structuredClone(r.data),
            created_at: r.created_at,
            read_at: r.read_at,
          }));
        default:
          throw new Error(
            `fake db: unsupported SELECT column list ${JSON.stringify(cols)} in: ${text}`
          );
      }
    }

    if ((match = text.match(/^UPDATE submissions SET (.+?) WHERE (.+?)( RETURNING id)?$/))) {
      const [, set, where, returning] = match as unknown as (string | undefined)[];
      const targets = this.filter(where, values, text);
      for (const row of targets) this.applySet(row, set as string, values, text);
      return returning ? targets.map((r) => ({ id: r.id })) : [];
    }

    throw new Error(
      `fake db: unsupported query shape. Teach FakeSubmissionsDb about it:\n  ${text}`
    );
  }

  private insert(type: string, json: string): number {
    const id = this.nextId++;
    this.rows.set(id, {
      id,
      type,
      data: JSON.parse(json) as Record<string, unknown>,
      created_at: new Date(this.clock()).toISOString(),
      read_at: null,
    });
    return id;
  }

  private filter(
    where: string | undefined,
    values: unknown[],
    fullText: string
  ): StoredSubmission[] {
    const predicates = (where ? where.split(" AND ") : []).map((c) =>
      this.predicate(c.trim(), values, fullText)
    );
    return [...this.rows.values()].filter((row) => predicates.every((p) => p(row)));
  }

  private predicate(condition: string, values: unknown[], fullText: string): Predicate {
    let m: RegExpMatchArray | null;
    if ((m = condition.match(/^id = \$(\d+)$/))) {
      const wanted = values[Number(m[1]) - 1];
      if (typeof wanted !== "number") {
        throw new Error(
          `fake db: id parameter must be a number, got ${typeof wanted} in: ${fullText}`
        );
      }
      return (row) => row.id === wanted;
    }
    if ((m = condition.match(/^type = '([^']+)'$/))) return (row) => row.type === m![1];
    if (condition === "read_at IS NULL") return (row) => row.read_at === null;
    if ((m = condition.match(/^data->>'(\w+)' = '([^']*)'$/))) {
      return (row) => jsonText(row.data[m![1]]) === m![2];
    }
    if ((m = condition.match(/^data->>'(\w+)' IS NULL$/))) {
      return (row) => jsonText(row.data[m![1]]) === null;
    }
    if ((m = condition.match(/^data->>'(\w+)' IS NOT NULL$/))) {
      return (row) => jsonText(row.data[m![1]]) !== null;
    }
    if (
      (m = condition.match(/^\(data->>'(\w+)'\)::timestamptz > now\(\) - interval '(\d+) days?'$/))
    ) {
      const key = m[1];
      const days = Number(m[2]);
      return (row) => {
        const text = jsonText(row.data[key]);
        const at = text === null ? NaN : Date.parse(text);
        return Number.isFinite(at) && at > this.clock() - days * 86_400_000;
      };
    }
    throw new Error(
      `fake db: unsupported WHERE condition ${JSON.stringify(condition)} in: ${fullText}`
    );
  }

  private applySet(row: StoredSubmission, set: string, values: unknown[], fullText: string): void {
    let m: RegExpMatchArray | null;
    if ((m = set.match(/^data = data \|\| \$(\d+)::jsonb$/))) {
      const patch = values[Number(m[1]) - 1];
      if (typeof patch !== "string") {
        throw new Error(`fake db: jsonb patch parameter must be a JSON string in: ${fullText}`);
      }
      const parsed = JSON.parse(patch) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`fake db: jsonb patch must be a JSON object in: ${fullText}`);
      }
      row.data = { ...row.data, ...(parsed as Record<string, unknown>) };
      return;
    }
    if ((m = set.match(/^data = data - '(\w+)'$/))) {
      const { [m[1]]: _removed, ...rest } = row.data;
      void _removed;
      row.data = rest;
      return;
    }
    if ((m = set.match(/^data = jsonb_set\(data, '\{(\w+)\}', to_jsonb\(\$(\d+)::text\)\)$/))) {
      row.data = { ...row.data, [m[1]]: String(values[Number(m[2]) - 1]) };
      return;
    }
    if (set === "read_at = now()") {
      row.read_at = new Date(this.clock()).toISOString();
      return;
    }
    throw new Error(`fake db: unsupported SET clause ${JSON.stringify(set)} in: ${fullText}`);
  }
}

/** Postgres `jsonb ->> key`: text for scalars, NULL for missing keys and JSON null. */
function jsonText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
