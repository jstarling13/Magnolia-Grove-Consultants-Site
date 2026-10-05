import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Generous cap; stops a multi-megabyte "password" from being hashed. */
export const MAX_PASSWORD_LENGTH = 128;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidateHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");
  if (candidateHash.length !== storedHash.length) return false;
  return timingSafeEqual(candidateHash, storedHash);
}

// A well-formed hash of a random password nobody knows, computed once.
let decoyHash: string | undefined;

/**
 * Spends the same scrypt time as a real check. Call it when the account
 * doesn't exist so response time doesn't reveal which usernames/emails are
 * registered. Always returns false.
 */
export function verifyAgainstDecoy(password: string): false {
  decoyHash ??= hashPassword(randomBytes(16).toString("hex"));
  verifyPasswordHash(password, decoyHash);
  return false;
}
