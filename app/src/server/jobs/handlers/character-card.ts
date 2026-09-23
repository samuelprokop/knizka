import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { aiMockDelay, getImageProvider, withAiJob } from "@/server/ai";
import type { CharacterCardPayload, JobContext, JobHandler } from "../types";

export const characterCardHandler: JobHandler<"character_card"> = {
  async run(payload: CharacterCardPayload, ctx: JobContext) {
    await aiMockDelay();
    const { images } = await withAiJob(
      { projectId: ctx.projectId, kind: "character_card", params: { style: payload.request.style }, attempt: ctx.attempt },
      () => getImageProvider().characterCard(payload.request)
    );
    await db
      .update(schema.characterCards)
      .set({ status: "ready", images: Object.fromEntries(Object.entries(images).map(([slot, img]) => [slot, img.storageKey])) })
      .where(eq(schema.characterCards.id, payload.cardId));
  },

  async onExhausted(payload: CharacterCardPayload) {
    await db.update(schema.characterCards).set({ status: "failed" }).where(eq(schema.characterCards.id, payload.cardId));
  },
};
