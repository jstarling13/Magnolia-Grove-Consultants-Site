import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "../../../../lib/asi/client";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!q || q.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 1000)
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  if (!process.env.ASI_SMARTLINK_CLIENT_ID || !process.env.ASI_SMARTLINK_CLIENT_SECRET)
    return NextResponse.json({ error: "Catalog integration is not configured" }, { status: 503 });
  try {
    // Raw ASI data is intentionally not exposed. Map to an end-user-safe shape
    // after a real response confirms the fields representing cost and retail price.
    await searchProducts(q, page);
    return NextResponse.json({ error: "ASI product mapping pending verified sample" }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Catalog temporarily unavailable" }, { status: 502 });
  }
}
