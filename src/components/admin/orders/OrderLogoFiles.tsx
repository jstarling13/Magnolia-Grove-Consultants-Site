import { formatOrderDate } from "@/lib/adminOrders";
import { formatFileSize, isRasterMime } from "@/lib/orderLogo";
import type { OrderFileSummary } from "@/lib/orderFiles";
import { FOCUS_RING } from "@/components/global/focusRing";

const KIND_LABELS: Record<string, string> = {
  "image/png": "PNG image",
  "image/jpeg": "JPEG image",
  "image/webp": "WebP image",
  "image/svg+xml": "SVG vector",
  "application/pdf": "PDF",
  "application/postscript": "PostScript (AI or EPS)",
};

/**
 * The logo files the customer attached to their request. Everything is served
 * by the admin-only route /admin/orders/[id]/files/[fileId]: Download always
 * saves the file (never opens it), and the small thumbnail exists only for
 * PNG, JPEG and WebP.
 */
export default function OrderLogoFiles({
  orderId,
  files,
}: {
  orderId: number;
  files: OrderFileSummary[];
}) {
  return (
    <section
      aria-label="Logo files"
      className="mt-6 rounded-lg border border-gold/25 bg-cream-100 p-5"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gold-text">Logo files</h2>
      {files.length === 0 ? (
        <p className="mt-2 text-sm text-onyx/60">
          No logo attached. The customer was asked to reply to their confirmation email with it.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gold/15">
          {files.map((file) => {
            const base = `/admin/orders/${orderId}/files/${file.id}`;
            return (
              <li key={file.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0">
                {isRasterMime(file.mime) && (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-gold/25 bg-white">
                    {/* Authenticated admin route, not a public asset, so next/image does not apply. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${base}?preview=1`}
                      alt={`Preview of ${file.filename}`}
                      className="max-h-14 max-w-14 object-contain"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium text-onyx">{file.filename}</p>
                  <p className="mt-0.5 text-xs text-onyx/60">
                    {KIND_LABELS[file.mime] ?? file.mime} · {formatFileSize(file.size)} · Added{" "}
                    {formatOrderDate(file.createdAt) || "(date unknown)"}
                  </p>
                </div>
                <a
                  href={base}
                  download
                  aria-label={`Download ${file.filename}`}
                  className={`inline-flex min-h-11 items-center rounded-md border border-gold-text px-4 py-2 text-sm font-semibold text-gold-text transition-colors hover:bg-gold/10 ${FOCUS_RING}`}
                >
                  Download
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
