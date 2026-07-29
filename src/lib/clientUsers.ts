import { sql } from "./db";
import { hashPassword, verifyPasswordHash } from "./passwords";

export interface ClientProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  orgName: string;
}

interface ClientUserRow {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  org_name: string;
}

function toProfile(row: ClientUserRow): ClientProfile {
  return {
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    orgName: row.org_name,
  };
}

export async function createClientUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  orgName: string;
}): Promise<{ ok: true } | { ok: false; reason: "email_taken" }> {
  const existing = (await sql`
    SELECT 1 FROM client_users WHERE lower(email) = lower(${params.email}) LIMIT 1
  `) as unknown[];
  if (existing.length > 0) return { ok: false, reason: "email_taken" };

  const passwordHash = hashPassword(params.password);
  await sql`
    INSERT INTO client_users (email, password_hash, first_name, last_name, phone, org_name)
    VALUES (${params.email}, ${passwordHash}, ${params.firstName}, ${params.lastName}, ${params.phone}, ${params.orgName})
  `;
  return { ok: true };
}

export async function verifyClientCredentials(
  email: string,
  password: string
): Promise<string | null> {
  const rows = (await sql`
    SELECT email, password_hash FROM client_users WHERE lower(email) = lower(${email}) LIMIT 1
  `) as { email: string; password_hash: string }[];

  const user = rows[0];
  if (!user) return null;
  if (!verifyPasswordHash(password, user.password_hash)) return null;

  return user.email;
}

export async function getClientProfile(email: string): Promise<ClientProfile | null> {
  const rows = (await sql`
    SELECT email, password_hash, first_name, last_name, phone, org_name
    FROM client_users WHERE lower(email) = lower(${email}) LIMIT 1
  `) as ClientUserRow[];

  const user = rows[0];
  return user ? toProfile(user) : null;
}
