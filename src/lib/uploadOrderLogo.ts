/**
 * Browser side of step two: sends the logo to /api/merchant/order-logo as
 * multipart/form-data, with the order reference and the upload token the
 * order-creation response returned. Never throws; the order is already saved,
 * so the caller only needs to know whether the logo made it.
 */

const UPLOAD_TIMEOUT_MS = 60_000;

export interface LogoUploadResult {
  ok: boolean;
  /** The server's message when it gave one (specific and safe to show). */
  error?: string;
}

export async function uploadOrderLogo(
  file: File,
  orderRef: string,
  token: string
): Promise<LogoUploadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append("orderRef", orderRef);
    form.append("token", token);
    form.append("file", file, file.name);
    const response = await fetch("/api/merchant/order-logo", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: unknown;
      error?: unknown;
    };
    if (response.ok && data.success === true) return { ok: true };
    return { ok: false, error: typeof data.error === "string" ? data.error : undefined };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
