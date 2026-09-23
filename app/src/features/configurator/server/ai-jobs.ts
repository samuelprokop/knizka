import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import type { CallMeta } from "@/server/ai";

/*
  Každé volanie AI sa loguje do ai_jobs (I2). Do params/prompt nejde fotka
  ani meno dieťaťa – len technické parametre (štýl, pomer, pokyn z ponuky).
  Keď balík B dodá frontu, konfigurátor bude úlohy len zakladať a toto
  logovanie prevezme worker.
*/

export async function withAiJob<T extends { meta: CallMeta }>(
  job: { projectId: string; kind: string; params?: Record<string, unknown>; prompt?: string },
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
