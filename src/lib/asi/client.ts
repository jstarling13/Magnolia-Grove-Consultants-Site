// Server only. Never import this module into a client component.
import "server-only";

const baseUrl = "https://api.asicentral.com/v1";

export async function smartLinkGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const id = process.env.ASI_SMARTLINK_CLIENT_ID;
  const secret = process.env.ASI_SMARTLINK_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SmartLink credentials are not configured");
  if (!path.startsWith("/products/") || path.includes("..")) throw new Error("Invalid SmartLink path");
  const url = new URL(baseUrl + path + ".json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `AsiMemberAuth client_id=${id}&client_secret=${secret}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SmartLink returned ${response.status}`);
  return response.json();
}

export function searchProducts(q: string, page = 1) {
  if (q.length > 100 || !Number.isSafeInteger(page) || page < 1) throw new Error("Invalid search");
  return smartLinkGet("/products/search", { q, page: String(page), rpp: "24" });
}

export function getProduct(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("Invalid product ID");
  return smartLinkGet(`/products/${id}`);
}
