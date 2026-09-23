import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import type { AdminRole } from "./roles";

const KEY_LEN = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export type AdminUser = typeof schema.adminUsers.$inferSelect;

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const [user] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Nesprávny e-mail alebo heslo.");
  }
}

export class AccountDisabledError extends Error {
  constructor() {
    super("Účet je deaktivovaný.");
  }
}

/** Overí prihlasovacie údaje; nerozlišuje v chybe, či zlyhal e-mail alebo heslo. */
export async function authenticate(email: string, password: string): Promise<AdminUser> {
  const user = await findUserByEmail(email);
  if (!user) throw new InvalidCredentialsError();
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) throw new InvalidCredentialsError();
  if (!user.active) throw new AccountDisabledError();
  return user;
}

export async function createAdminUser(input: { email: string; name: string; role: AdminRole; password: string }): Promise<AdminUser> {
  const { hash, salt } = hashPassword(input.password);
  const [user] = await db
    .insert(schema.adminUsers)
    .values({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: hash,
      passwordSalt: salt,
    })
    .returning();
  return user;
}
