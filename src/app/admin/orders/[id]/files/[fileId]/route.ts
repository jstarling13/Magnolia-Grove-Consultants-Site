import { NextResponse } from "next/server";
import { getOrderFile } from "@/lib/orderFiles";
import { isRasterMime } from "@/lib/orderLogo";
import { getAdminSession } from "../../../guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; fileId: string }>;

/** Content-Disposition value with a plain ASCII fallback and the full name encoded (RFC 6266 / 5987). */
function contentDisposition(kind: "attachment" | "inline", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

/**
 * A customer's logo, for admins only. Middleware already requires an admin
 * session for /admin; the handler checks again (including revocation) so the
 * file never depends on routing alone.
 *
 * Default: a download. The body is served as application/octet-stream with
 * Content-Disposition: attachment, never as the stored type, so a hostile
 * SVG or PDF can never be rendered by the browser from our origin.
 *
 * ?preview=1: only for PNG, JPEG and WebP, served inline with its raster
 * content type for the small thumbnail on the order page. Every other type
 * is refused, so SVG and PDF can never be shown inline. Both modes carry
 * X-Content-Type-Options: nosniff and a CSP that blocks everything.
 */
export async function GET(request: Request, { params }: { params: Params }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id, fileId } = await params;
  if (!/^\d{1,9}$/.test(id) || !/^\d{1,9}$/.test(fileId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let file;
  try {
    file = await getOrderFile(Number(id), Number(fileId));
  } catch (error) {
    console.error("[admin/orders] could not read order file:", error);
    return NextResponse.json({ error: "Couldn't read the file." }, { status: 500 });
  }
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const baseHeaders = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": "private, no-store",
    "Content-Length": String(file.data.length),
  };
  const body = new Uint8Array(file.data);

  if (new URL(request.url).searchParams.get("preview") === "1") {
    if (!isRasterMime(file.mime)) {
      return NextResponse.json({ error: "No preview for this file type." }, { status: 415 });
    }
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": file.mime,
        "Content-Disposition": contentDisposition("inline", file.filename),
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition("attachment", file.filename),
    },
  });
}
