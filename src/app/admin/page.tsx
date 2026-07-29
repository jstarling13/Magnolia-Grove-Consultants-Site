import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  const submissions = (await sql`
    SELECT id, type, data, created_at, read_at
    FROM submissions
    ORDER BY created_at DESC
    LIMIT 200
  `) as SubmissionRow[];

  return <Dashboard submissions={submissions} username={session?.username ?? ""} />;
}
