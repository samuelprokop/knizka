import "server-only";

import { randomBytes } from "node:crypto";
import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { createAdminUser, hashPassword } from "./auth";
import type { AdminRole } from "./roles";

export async function listAdminUsers() {
  return db
    .select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.role,
      active: schema.adminUsers.active,
      lastLoginAt: schema.adminUsers.lastLoginAt,
      createdAt: schema.adminUsers.createdAt,
    })
    .from(schema.adminUsers)
    .orderBy(asc(schema.adminUsers.email));
}

/** Vytvorí používateľa s náhodným jednorazovým heslom – zobrazí sa raz, potom sa neuchováva. */
export async function inviteAdminUser(input: { email: string; name: string; role: AdminRole }): Promise<{ tempPassword: string }> {
  const tempPassword = randomBytes(9).toString("base64url");
  await createAdminUser({ ...input, password: tempPassword });
  return { tempPassword };
}

export async function setAdminUserActive(userId: string, active: boolean): Promise<void> {
  await db.update(schema.adminUsers).set({ active }).where(eq(schema.adminUsers.id, userId));
}

export async function resetAdminUserPassword(userId: string): Promise<{ tempPassword: string }> {
  const tempPassword = randomBytes(9).toString("base64url");
  const { hash, salt } = hashPassword(tempPassword);
  await db.update(schema.adminUsers).set({ passwordHash: hash, passwordSalt: salt }).where(eq(schema.adminUsers.id, userId));
  return { tempPassword };
}
