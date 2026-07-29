import { NextRequest, NextResponse } from "next/server";
import { verifyMigratePassword } from "@/lib/adminAuth";
import { hashPassword } from "@/lib/passwords";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const ADMIN_USERNAMES = ["Bgarcia", "Ntillotson", "Jstarling", "Abrown"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !verifyMigratePassword(password)) {
    return NextResponse.json({ success: false }, { status: 401 });
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

  const resetPassword = (body as { resetPassword?: unknown } | null)?.resetPassword;
  if (typeof resetPassword === "string" && resetPassword.length > 0) {
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
