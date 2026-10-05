import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { CATALOG_POLICY } from "@/lib/rateLimitPolicies";
import { getClientIp, tooManyRequests } from "@/lib/http";
import { getProduct } from "../../../../../lib/asi/client";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(`catalog:${getClientIp(_request)}`, CATALOG_POLICY);
  if (!limit.success) return tooManyRequests(undefined, limit.retryAfterSeconds);
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  if (!process.env.ASI_SMARTLINK_CLIENT_ID || !process.env.ASI_SMARTLINK_CLIENT_SECRET)
    return NextResponse.json({ error: "Catalog integration is not configured" }, { status: 503 });
  try {
    await getProduct(id);
    return NextResponse.json(
      { error: "ASI product mapping pending verified sample" },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Product temporarily unavailable" }, { status: 502 });
  }
}
