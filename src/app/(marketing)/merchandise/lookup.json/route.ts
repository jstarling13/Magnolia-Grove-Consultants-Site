import { NextResponse } from "next/server";
import { getRecentLookup } from "@/lib/merchStorefront";

// Static at build time: names, photos and starting prices only.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getRecentLookup());
}
