import "server-only";

import { db, schema } from "@/db";
import type { JobPayloadByType, JobType } from "./types";

/**
 * Zaradenie úlohy do fronty (N3). Výpadok adaptéra alebo reštart procesu
 * nestratí objednávku (N5) – úloha ostáva zapísaná v `jobs`, kým ju worker
 * (alebo inline spracovanie) nedokončí alebo nevyčerpá pokusy.
 */
export async function enqueue<T extends JobType>(input: {
  type: T;
  projectId: string | null;
  payload: JobPayloadByType[T];
  relatedType?: string;
  relatedId?: string;
  maxAttempts?: number;
}): Promise<string> {
  const [row] = await db
    .insert(schema.jobs)
    .values({
      type: input.type,
      projectId: input.projectId,
      payload: input.payload,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      maxAttempts: input.maxAttempts ?? 3,
    })
    .returning({ id: schema.jobs.id });
  return row.id;
}
