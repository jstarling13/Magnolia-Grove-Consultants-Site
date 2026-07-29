import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Instantiated lazily (not at module load) so Next.js's build-time page-data
// collection doesn't crash when DATABASE_URL isn't present in that environment.
let client: NeonQueryFunction<false, false> | undefined;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) client = neon(process.env.DATABASE_URL!);
  return client;
}

export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => getClient()(strings, ...values)) as NeonQueryFunction<false, false>;
