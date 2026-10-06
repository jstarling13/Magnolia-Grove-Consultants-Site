import { formatOrderDate, type AuditTrailRow } from "@/lib/adminOrders";

/** Who changed what and when. Orders handled before the log existed show only the first row. */
export default function OrderAuditTrail({
  rows,
  hasHistory,
}: {
  rows: AuditTrailRow[];
  hasHistory: boolean;
}) {
  return (
    <section
      aria-labelledby="audit-trail-heading"
      className="mt-6 rounded-lg border border-gold/25 bg-cream-100 p-5"
    >
      <h2
        id="audit-trail-heading"
        className="text-xs font-semibold uppercase tracking-wide text-gold-text"
      >
        Audit trail
      </h2>
      <ol aria-label="Audit trail" className="mt-3 divide-y divide-onyx/10 text-sm">
        {rows.map((row) => (
          <li
            key={row.key}
            data-audit-row
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0"
          >
            <span className="min-w-0 text-onyx">{row.text}</span>
            <span className="text-xs text-onyx/70">
              <time dateTime={row.at}>{formatOrderDate(row.at) || "Date unknown"}</time> by {row.by}
            </span>
          </li>
        ))}
      </ol>
      {!hasHistory && (
        <p className="mt-3 text-xs text-onyx/70">
          Changes made before audit logging was added are not recorded. New changes appear here.
        </p>
      )}
    </section>
  );
}
