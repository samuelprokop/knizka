import "server-only";

import { and, eq, lt, lte, type SQL } from "drizzle-orm";

import { db, schema } from "@/db";
import { getImageProvider } from "@/server/ai";
import { registry } from "./registry";
import type { JobType } from "./types";

export type JobRow = typeof schema.jobs.$inferSelect;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mock adaptér: skús znova hneď. Reálny poskytovateľ: exponenciálne odloženie do 30 s. */
function backoffMs(attempt: number): number {
  // Zlyhanie tu (napr. nesprávne AI_IMAGE_PROVIDER) nesmie zabrániť vráteniu úlohy do fronty.
  try {
    if (getImageProvider().id === "mock") return 0;
  } catch {
    // padni na exponenciálne odloženie nižšie
  }
  return Math.min(2_000 * 2 ** Math.max(0, attempt - 1), 30_000);
}

async function claim(where: SQL, workerId: string): Promise<JobRow | null> {
  return db.transaction(async (tx) => {
    const [candidate] = await tx.select().from(schema.jobs).where(where).orderBy(schema.jobs.runAt).limit(1).for("update", { skipLocked: true });
    if (!candidate) return null;
    const [claimed] = await tx
      .update(schema.jobs)
      .set({ status: "running", attempts: candidate.attempts + 1, lockedAt: new Date(), lockedBy: workerId })
      .where(eq(schema.jobs.id, candidate.id))
      .returning();
    return claimed ?? null;
  });
}

/** Vyzdvihne najstaršiu úlohu, ktorej čas prišiel (globálna fronta – používa samostatný worker). */
function claimNextJob(workerId: string) {
  return claim(and(eq(schema.jobs.status, "queued"), lte(schema.jobs.runAt, new Date()))!, workerId);
}

/** Vyzdvihne konkrétnu úlohu podľa id (na inline spracovanie v tej istej požiadavke). */
function claimJobById(jobId: string, workerId: string) {
  return claim(and(eq(schema.jobs.id, jobId), eq(schema.jobs.status, "queued"), lte(schema.jobs.runAt, new Date()))!, workerId);
}

/** Vystavené pre testy – spracuje už vyzdvihnutú úlohu (pokus, odloženie, vyčerpanie). */
export async function processClaimedJob(row: JobRow): Promise<void> {
  const handler = registry[row.type as JobType];
  if (!handler) {
    await db.update(schema.jobs).set({ status: "failed", error: `neznámy typ úlohy: ${row.type}` }).where(eq(schema.jobs.id, row.id));
    return;
  }
  const ctx = { projectId: row.projectId, attempt: row.attempts };
  try {
    await handler.run(row.payload, ctx);
    await db.update(schema.jobs).set({ status: "succeeded", error: null }).where(eq(schema.jobs.id, row.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (row.attempts >= row.maxAttempts) {
      await db.update(schema.jobs).set({ status: "failed", error: message }).where(eq(schema.jobs.id, row.id));
      await handler.onExhausted(row.payload, ctx);
    } else {
      await db
        .update(schema.jobs)
        .set({ status: "queued", error: message, runAt: new Date(Date.now() + backoffMs(row.attempts)) })
        .where(eq(schema.jobs.id, row.id));
    }
  }
}

/** Jeden krok globálnej fronty – vyzdvihne a spracuje jednu úlohu. Vráti false, ak nič nečaká. */
export async function runOnce(workerId: string): Promise<boolean> {
  const row = await claimNextJob(workerId);
  if (!row) return false;
  await processClaimedJob(row);
  return true;
}

/** Vyprázdni celú frontu synchrónne (testy, vývoj bez bežiaceho workera). */
export async function runPendingJobs(workerId = "inline-drain"): Promise<void> {
  while (await runOnce(workerId)) {
    // pokračuj, kým je čo spracovať
  }
}

/**
 * Spracuje jednu konkrétnu úlohu hneď v rámci aktuálneho volania (Karta postavy –
 * konfigurátor na ňu synchrónne čaká). Trvalý záznam v `jobs` zostáva zárukou, že
 * pád procesu pred dokončením úlohu nestratí – doberie ju worker.ts (N5).
 */
export async function runJobInline(jobId: string, workerId = "inline"): Promise<void> {
  for (;;) {
    const [row] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1);
    if (!row || row.status === "succeeded" || row.status === "failed") return;
    if (row.status === "running") {
      await sleep(30);
      continue;
    }
    const wait = row.runAt.getTime() - Date.now();
    if (wait > 0) await sleep(wait);
    const claimed = await claimJobById(jobId, workerId);
    if (!claimed) continue;
    await processClaimedJob(claimed);
  }
}

/** Úlohy zaseknuté v „running“ (padnutý proces) – vráti ich do fronty (N5). */
export async function reapStaleJobs(staleAfterMs = 2 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs);
  const stale = await db
    .select({ id: schema.jobs.id })
    .from(schema.jobs)
    .where(and(eq(schema.jobs.status, "running"), lt(schema.jobs.lockedAt, cutoff)));
  if (!stale.length) return 0;
  for (const row of stale) {
    await db.update(schema.jobs).set({ status: "queued", lockedAt: null, lockedBy: null }).where(eq(schema.jobs.id, row.id));
  }
  return stale.length;
}
