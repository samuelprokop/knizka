import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { aiMockDelay, getImageProvider, withAiJob } from "@/server/ai";
import type { JobContext, JobHandler, StylePortraitPayload } from "../types";

export const stylePortraitHandler: JobHandler<"style_portrait"> = {
  async run(payload: StylePortraitPayload, ctx: JobContext) {
    await aiMockDelay();
    const { image } = await withAiJob(
      { projectId: ctx.projectId, kind: "style_portrait", params: { style: payload.request.style }, attempt: ctx.attempt },
      () => getImageProvider().portrait(payload.request)
    );
    await db
      .update(schema.characterCards)
      .set({ status: "ready", images: { portrait: image.storageKey } })
      .where(eq(schema.characterCards.id, payload.cardId));
  },

  async onExhausted(payload: StylePortraitPayload) {
    await db.update(schema.characterCards).set({ status: "failed" }).where(eq(schema.characterCards.id, payload.cardId));
  },
};
