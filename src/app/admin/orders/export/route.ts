import { NextResponse } from "next/server";
import { buildOrdersCsv, parseOrderFilter } from "@/lib/adminOrders";
import { getAdminSession } from "../guard";
import { listOrdersForExport } from "../queries";

// Lets Excel open the file as UTF-8 (names with accents stay intact).
const UTF8_BOM = "\uFEFF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSV of the orders matching the current list filter (status, needs-action view,
 * search and sort; the page number is ignored). Middleware already requires an admin session for /admin;
 * the handler checks again so the export never depends on routing alone.
 */
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const filter = parseOrderFilter(new URL(request.url).searchParams);
  let csv: string;
  try {
    csv = buildOrdersCsv(await listOrdersForExport(filter));
  } catch (error) {
    console.error("[admin/orders] export failed:", error);
    return NextResponse.json({ error: "Couldn't build the export." }, { status: 500 });
  }

  const day = new Date().toISOString().slice(0, 10);
  const scope = filter.view ? filter.view.replace("_", "-") : (filter.status ?? "all");
  return new NextResponse(`${UTF8_BOM}${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="merch-orders-${scope}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
