"use server";

import { revalidatePath } from "next/cache";

import type { StyleId } from "@/config/catalog";
import { STYLES } from "@/config/catalog";
import { db, schema } from "@/db";
import type { SampleSpreadData } from "@/features/book/components/SampleSpread";
import { isBookLanguage, type BookLanguage } from "@/i18n/locales";
import {
  checkEdition,
  createStory,
  previewDraftSpread,
  publishEdition,
  setStoryPublished,
  STORY_CATEGORIES,
  type EditionCheck,
  type EditionDraft,
  type StoryCategory,
} from "../server/stories";
import { adminAction, type ActionResult } from "./common";

export async function checkEditionAction(draft: EditionDraft, language: string): Promise<ActionResult<EditionCheck>> {
  return adminAction("pribehy", async () => {
    if (!isBookLanguage(language)) throw new Error("Neznámy jazyk.");
    return checkEdition(draft, language);
  }, { readOnly: true });
}

export async function previewDraftSpreadAction(
  language: string,
  style: string,
  spread: { text: string; fallbackText: string; scene: string }
): Promise<ActionResult<SampleSpreadData>> {
  return adminAction("pribehy", async () => {
    if (!isBookLanguage(language)) throw new Error("Neznámy jazyk.");
    if (!(STYLES as readonly string[]).includes(style)) throw new Error("Neznámy štýl.");
    return previewDraftSpread(language as BookLanguage, style as StyleId, spread);
  }, { readOnly: true });
}

export async function createStoryAction(input: {
  slug: string;
  category: string;
  ageMin: number;
  ageMax: number;
  spreads: number;
  styles: string[];
  companionSlots: number;
  needsGuide: boolean;
}): Promise<ActionResult<{ id: string }>> {
  return adminAction("pribehy", async (admin) => {
    if (!input.slug.trim()) throw new Error("Slug je povinný.");
    if (!(STORY_CATEGORIES as readonly string[]).includes(input.category)) throw new Error("Neznáma kategória.");
    if (input.spreads !== 12 && input.spreads !== 16) throw new Error("Počet dvojstrán musí byť 12 alebo 16.");
    if (input.ageMin < 0 || input.ageMax < input.ageMin) throw new Error("Neplatný vekový rozsah.");
    const styles = input.styles.filter((s): s is StyleId => (STYLES as readonly string[]).includes(s));
    if (!styles.length) throw new Error("Vyberte aspoň jeden štýl.");

    const story = await createStory({
      slug: input.slug,
      category: input.category as StoryCategory,
      ageMin: input.ageMin,
      ageMax: input.ageMax,
      spreads: input.spreads,
      styles,
      companionSlots: input.companionSlots,
      needsGuide: input.needsGuide,
    });
    await db.insert(schema.auditLog).values({ actor: admin.email, action: "story.create", subjectType: "story", subjectId: story.id });
    revalidatePath("/admin/pribehy");
    return { id: story.id };
  });
}

export async function publishEditionAction(storyId: string, language: string, draft: EditionDraft): Promise<ActionResult<{ version: number }>> {
  return adminAction("pribehy", async (admin) => {
    if (!isBookLanguage(language)) throw new Error("Neznámy jazyk.");
    const edition = await publishEdition(storyId, language, draft);
    await db.insert(schema.auditLog).values({
      actor: admin.email,
      action: "story.publish_edition",
      subjectType: "story_edition",
      subjectId: edition.id,
      reason: `verzia ${edition.version}`,
    });
    revalidatePath("/admin/pribehy");
    revalidatePath(`/admin/pribehy/${storyId}/${language}`);
    return { version: edition.version };
  });
}

export async function setStoryPublishedAction(storyId: string, published: boolean): Promise<ActionResult> {
  return adminAction("pribehy", async (admin) => {
    await setStoryPublished(storyId, published);
    await db.insert(schema.auditLog).values({
      actor: admin.email,
      action: published ? "story.publish" : "story.unpublish",
      subjectType: "story",
      subjectId: storyId,
    });
    revalidatePath("/admin/pribehy");
  });
}
