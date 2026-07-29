import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";
import { getClientProfile } from "@/lib/clientUsers";
import { getPaymentLinkStatus, type PaymentStatus } from "@/lib/square";
import { servicePillars } from "@/config/siteConfig";
import { pillars } from "@/config/pillarsConfig";
import AccountPortal, { type ClientSubmissionRow } from "@/components/account/AccountPortal";

export const dynamic = "force-dynamic";

interface SubmissionQueryRow {
  id: number;
  type: "lead" | "strategy_session" | "payment_request";
  data: Record<string, unknown>;
  created_at: string;
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const session = verifyClientSessionToken(cookieStore.get(CLIENT_SESSION_COOKIE)?.value);

  // Middleware already guarantees a valid session for this route, but keep
  // a safe fallback rather than assuming a non-null email downstream.
  if (!session) {
    return null;
  }

  const [profile, rawSubmissions] = await Promise.all([
    getClientProfile(session.email),
    sql`
      SELECT id, type, data, created_at
      FROM submissions
      WHERE lower(data->>'email') = lower(${session.email})
      ORDER BY created_at DESC
    `,
  ]);
  const typedSubmissions = rawSubmissions as unknown as SubmissionQueryRow[];

  const submissions: ClientSubmissionRow[] = await Promise.all(
    typedSubmissions.map(async (row) => {
      if (row.type !== "payment_request") {
        return { ...row, paymentStatus: null as PaymentStatus | null };
      }
      const paymentLinkId = row.data.paymentLinkId;
      const paymentStatus =
        typeof paymentLinkId === "string" ? await getPaymentLinkStatus(paymentLinkId) : "unknown";
      return { ...row, paymentStatus };
    })
  );

  const usedPillarSlugs = new Set<string>();
  for (const row of submissions) {
    if (row.type === "lead") {
      const match = servicePillars.find((p) => p.title === row.data.service);
      if (match) usedPillarSlugs.add(match.pillarSlug);
    }
    if (row.type === "strategy_session") {
      const match = pillars.find((p) => p.heroTitle === row.data.pillar);
      if (match) usedPillarSlugs.add(match.slug);
    }
  }

  const unusedPillars = pillars.filter((p) => !usedPillarSlugs.has(p.slug));

  return (
    <AccountPortal
      profile={profile}
      submissions={submissions}
      unusedPillars={unusedPillars.map((p) => ({
        slug: p.slug,
        navLabel: p.navLabel,
        heroTitle: p.heroTitle,
      }))}
    />
  );
}
