import { NextRequest, NextResponse } from "next/server";
import { verifyMigratePassword } from "@/lib/adminAuth";
import { hashPassword, MAX_PASSWORD_LENGTH } from "@/lib/passwords";
import { sql } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { MIGRATE_POLICY } from "@/lib/rateLimitPolicies";
import { getClientIp, readJsonBody, serverError, tooManyRequests } from "@/lib/http";

export const runtime = "nodejs";

const ADMIN_USERNAMES = ["Bgarcia", "Ntillotson", "Jstarling", "Abrown"];

export async function POST(request: NextRequest) {
  // One shared password guards this endpoint (which can reset every admin
  // password), so it is throttled hard. It also answers 401 when
  // ADMIN_PASSWORD is unset: unset that variable once migrations are done.
  const limit = await checkRateLimit(`migrate:${getClientIp(request)}`, MIGRATE_POLICY);
  if (!limit.success) return tooManyRequests(undefined, limit.retryAfterSeconds);

  const read = await readJsonBody(request, 4 * 1024);
  const body = read.ok ? read.body : null;
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !verifyMigratePassword(password)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    return await runMigration(body);
  } catch (error) {
    console.error("[api/admin/migrate] failed:", error instanceof Error ? error.message : error);
    return serverError("Migration failed. Check the server logs.");
  }
}

async function runMigration(body: unknown) {
  const requestedReset = (body as { resetPassword?: unknown } | null)?.resetPassword;
  if (
    typeof requestedReset === "string" &&
    requestedReset.length > 0 &&
    (requestedReset.length < 8 || requestedReset.length > MAX_PASSWORD_LENGTH)
  ) {
    return NextResponse.json(
      { success: false, error: `resetPassword must be 8-${MAX_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS client_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      org_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const resetPassword = (body as { resetPassword?: unknown } | null)?.resetPassword;
  if (
    typeof resetPassword === "string" &&
    resetPassword.length >= 8 &&
    resetPassword.length <= MAX_PASSWORD_LENGTH
  ) {
    for (const username of ADMIN_USERNAMES) {
      const passwordHash = hashPassword(resetPassword);
      await sql`
        INSERT INTO admin_users (username, password_hash)
        VALUES (${username}, ${passwordHash})
        ON CONFLICT (username) DO UPDATE SET password_hash = excluded.password_hash
      `;
    }
  }

  return NextResponse.json({ success: true });
}
