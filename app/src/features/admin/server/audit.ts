import "server-only";

import { and, desc, eq, ilike } from "drizzle-orm";

import { db, schema } from "@/db";

export type AuditEntry = typeof schema.auditLog.$inferSelect;

export async function listAuditLog(filter: { actor?: string; action?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  return db
    .select()
    .from(schema.auditLog)
    .where(
      and(
        filter.actor ? ilike(schema.auditLog.actor, `%${filter.actor}%`) : undefined,
        filter.action ? eq(schema.auditLog.action, filter.action) : undefined
      )
    )
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(filter.limit ?? 200);
}
