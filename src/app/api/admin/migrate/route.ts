import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !verifyPassword(password)) {
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

  return NextResponse.json({ success: true });
}
