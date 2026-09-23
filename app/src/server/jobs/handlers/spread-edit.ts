import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { aiMockDelay, getImageProvider, withAiJob } from "@/server/ai";
import { getPageChecker } from "@/server/qa";
import { applySpreadResult } from "@/features/configurator/server/book";
import type { JobContext, JobHandler, SpreadEditPayload } from "../types";

async function markNeedsReview(pageId: string) {
  await db.update(schema.bookPages).set({ status: "needs_review" }).where(eq(schema.bookPages.id, pageId));
}

export const spreadEditHandler: JobHandler<"spread_edit"> = {
  async run(payload: SpreadEditPayload, ctx: JobContext) {
    await aiMockDelay();
    const { image } = await withAiJob(
      { projectId: ctx.projectId, kind: "scene", params: { style: payload.style, layout: payload.layout, edit: true }, prompt: payload.instruction, attempt: ctx.attempt },
      () =>
        getImageProvider().scene({
          style: payload.style,
          scene: `${payload.scene} ${payload.instruction}`,
          characterCardKeys: payload.characterCardKeys,
          aspect: payload.aspect,
        })
    );

    const verdict = await getPageChecker().check({
      image,
      expectedCharacterCount: payload.characterCardKeys.length,
      layout: payload.layout,
    });
    if (verdict.verdict === "needs_review") return markNeedsReview(payload.pageId);
    if (verdict.verdict === "regenerate") throw new Error(`kontrola strany: ${verdict.reason}`);

    await applySpreadResult(payload.pageId, image.storageKey);
  },

  async onExhausted(payload: SpreadEditPayload) {
    await markNeedsReview(payload.pageId);
  },
};
