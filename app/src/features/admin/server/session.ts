import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db, schema } from "@/db";
import type { AdminUser } from "./auth";
import { type AdminModule, type AdminRole, canAccess } from "./roles";

const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 12;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(user: AdminUser): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const userAgent = (await headers()).get("user-agent");
  await db.insert(schema.adminSessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    userAgent,
    expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000),
  });
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, user.id));

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db
      .update(schema.adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.adminSessions.tokenHash, hashToken(token)));
  }
  store.delete(COOKIE_NAME);
}

export type CurrentAdmin = { id: string; email: string; name: string; role: AdminRole };

/** Aktuálne prihlásený používateľ, alebo null – nevyhadzuje chybu (na použitie v layoute). */
export async function currentAdmin(): Promise<CurrentAdmin | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ user: schema.adminUsers, session: schema.adminSessions })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
    .where(
      and(
        eq(schema.adminSessions.tokenHash, hashToken(token)),
        isNull(schema.adminSessions.revokedAt),
        gt(schema.adminSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row || !row.user.active) return null;
  return { id: row.user.id, email: row.user.email, name: row.user.name, role: row.user.role };
}

export class AccessDeniedError extends Error {
  constructor(message = "Bez prístupu.") {
    super(message);
  }
}

/** Pre server akcie: overí reláciu (a voliteľne modul) vždy nanovo, nezávisle od UI. */
export async function requireAdmin(mod?: AdminModule): Promise<CurrentAdmin> {
  const admin = await currentAdmin();
  if (!admin) throw new AccessDeniedError("Prihláste sa.");
  if (mod && !canAccess(admin.role, mod)) throw new AccessDeniedError("Táto rola nemá prístup do tohto modulu.");
  return admin;
}

/**
 * Pre stránky (Server Components): namiesto vyhodenia chyby presmeruje – na
 * prihlásenie bez relácie, na hlavnú stránku bez prístupu k modulu (layout
 * v `(protected)` už reláciu overil, toto je istota nezávislá od neho).
 */
export async function requireAdminPage(mod?: AdminModule): Promise<CurrentAdmin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/prihlasenie");
  if (mod && !canAccess(admin.role, mod)) redirect("/admin");
  return admin;
}
