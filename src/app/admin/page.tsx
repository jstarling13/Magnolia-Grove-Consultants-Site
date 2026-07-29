import { sql } from "@/lib/db";
import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const submissions = (await sql`
    SELECT id, type, data, created_at, read_at
    FROM submissions
    ORDER BY created_at DESC
    LIMIT 200
  `) as SubmissionRow[];

  return <Dashboard submissions={submissions} />;
}
