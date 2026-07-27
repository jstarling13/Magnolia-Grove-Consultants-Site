const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const isTurnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY);

/**
 * Verifies a Cloudflare Turnstile token server-side. If Turnstile isn't
 * configured (no secret key), verification is skipped and this returns
 * true — the widget is also hidden client-side in that case, so this only
 * ever happens in environments that haven't opted into CAPTCHA yet.
 */
export async function verifyTurnstileToken(token: string | undefined, ip?: string): Promise<boolean> {
  if (!isTurnstileEnabled) return true;
  if (!token) return false;

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
  });
  if (ip) body.append("remoteip", ip);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await response.json()) as { success: boolean };
    return data.success;
  } catch (error) {
    console.error("[turnstile] verification request failed:", error);
    return false;
  }
}
