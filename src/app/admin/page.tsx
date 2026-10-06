import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { getVerifiedAdminSession } from "@/lib/adminSessions";
import { syncAwaitingMerchPayments } from "@/lib/merchPayments";
import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  // Middleware only checks the signature; a signed-out (revoked) session is turned away here.
  const session = await getVerifiedAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");

  const submissions = (await sql`
    SELECT id, type, data, created_at, read_at
    FROM submissions
    ORDER BY created_at DESC
    LIMIT 200
  `) as SubmissionRow[];

  await syncAwaitingMerchPayments(submissions);

  return (
    <Dashboard
      submissions={submissions}
      username={session.username}
      deliverablesBySubmission={{}}
    />
  );
}
