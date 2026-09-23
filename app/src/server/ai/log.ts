import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db, schema } from "@/db";
import { getImageProvider } from "./registry";
import type { CallMeta } from "./types";

/*
  Jediné miesto, ktoré loguje volania AI do ai_jobs (I2): predtým duplicitne
  v features/configurator/server/ai-jobs.ts a features/book/server/illustrations.ts.
  Do params/prompt nejde fotka ani meno dieťaťa – len technické parametre.
*/

export async function withAiJob<T extends { meta: CallMeta }>(
  job: { projectId: string | null; kind: string; params?: Record<string, unknown>; prompt?: string; attempt?: number },
  call: () => Promise<T>
): Promise<T> {
  const [row] = await db
    .insert(schema.aiJobs)
    .values({
      projectId: job.projectId,
      kind: job.kind,
      provider: "pending",
      model: "pending",
      params: job.params,
      prompt: job.prompt,
      status: "running",
      attempt: job.attempt ?? 1,
      startedAt: new Date(),
    })
    .returning({ id: schema.aiJobs.id });

  try {
    const result = await call();
    await db
      .update(schema.aiJobs)
      .set({
        status: "succeeded",
        provider: result.meta.provider,
        model: result.meta.model,
        costMicroUsd: result.meta.costMicroUsd ?? null,
        finishedAt: new Date(),
      })
      .where(eq(schema.aiJobs.id, row.id));
    return result;
  } catch (error) {
    await db
      .update(schema.aiJobs)
      .set({ status: "failed", error: error instanceof Error ? error.message : String(error), finishedAt: new Date() })
      .where(eq(schema.aiJobs.id, row.id));
    throw error;
  }
}

/** Umelé oneskorenie mock adaptéra, aby generovanie na pozadí pôsobilo reálne. */
export const aiMockDelay = () =>
  getImageProvider().id === "mock"
    ? new Promise((resolve) => setTimeout(resolve, Number(process.env.MOCK_AI_DELAY_MS ?? 700)))
    : Promise.resolve();

/** Súčet nákladov na volania AI pre projekt (náhľad nákladu na knihu, I2). */
export async function projectAiCost(projectId: string): Promise<number> {
  const rows = await db.select({ cost: schema.aiJobs.costMicroUsd }).from(schema.aiJobs).where(eq(schema.aiJobs.projectId, projectId));
  return rows.reduce((sum, r) => sum + (r.cost ?? 0), 0);
}

/** Súčet nákladov na viac projektov naraz (prehľad v administrácii, balík E). */
export async function projectsAiCost(projectIds: string[]): Promise<Record<string, number>> {
  if (!projectIds.length) return {};
  const rows = await db
    .select({ projectId: schema.aiJobs.projectId, cost: schema.aiJobs.costMicroUsd })
    .from(schema.aiJobs)
    .where(inArray(schema.aiJobs.projectId, projectIds));
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (!row.projectId) continue;
    totals[row.projectId] = (totals[row.projectId] ?? 0) + (row.cost ?? 0);
  }
  return totals;
}
