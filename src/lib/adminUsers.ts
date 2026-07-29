import { sql } from "./db";
import { verifyPasswordHash } from "./passwords";

export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<string | null> {
  const rows = (await sql`
    SELECT username, password_hash FROM admin_users WHERE lower(username) = lower(${username}) LIMIT 1
  `) as { username: string; password_hash: string }[];

  const user = rows[0];
  if (!user) return null;
  if (!verifyPasswordHash(password, user.password_hash)) return null;

  return user.username;
}
