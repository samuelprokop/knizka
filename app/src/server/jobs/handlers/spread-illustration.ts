import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { aiMockDelay, getImageProvider, withAiJob } from "@/server/ai";
import { getPageChecker } from "@/server/qa";
import { applySpreadResult, finalizeGenerationIfDone } from "@/features/configurator/server/book";
import type { JobContext, JobHandler, SpreadIllustrationPayload } from "../types";

async function markNeedsReview(pageId: string, projectId: string | null) {
  await db.update(schema.bookPages).set({ status: "needs_review" }).where(eq(schema.bookPages.id, pageId));
  if (projectId) await finalizeGenerationIfDone(projectId);
}

export const spreadIllustrationHandler: JobHandler<"spread_illustration"> = {
  async run(payload: SpreadIllustrationPayload, ctx: JobContext) {
    await aiMockDelay();
    const { image } = await withAiJob(
      { projectId: ctx.projectId, kind: "scene", params: { style: payload.style, layout: payload.layout, spread: payload.pageId }, attempt: ctx.attempt },
      () => getImageProvider().scene({ style: payload.style, scene: payload.scene, characterCardKeys: payload.characterCardKeys, aspect: payload.aspect })
    );

    const verdict = await getPageChecker().check({
      image,
      expectedCharacterCount: payload.characterCardKeys.length,
      layout: payload.layout,
    });
    if (verdict.verdict === "needs_review") return markNeedsReview(payload.pageId, ctx.projectId);
    if (verdict.verdict === "regenerate") throw new Error(`kontrola strany: ${verdict.reason}`);

    await applySpreadResult(payload.pageId, image.storageKey);
    if (ctx.projectId) await finalizeGenerationIfDone(ctx.projectId);
  },

  async onExhausted(payload: SpreadIllustrationPayload, ctx: JobContext) {
    await markNeedsReview(payload.pageId, ctx.projectId);
  },
};
