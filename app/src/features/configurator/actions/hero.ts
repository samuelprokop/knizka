"use server";

import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { STYLES, type StyleId } from "@/config/catalog";
import { eq } from "drizzle-orm";
import { loadBundle } from "../server/bundle";
import { PHOTO_CONSENTS, recordConsents } from "../server/consents";
import {
  approveHeroCard,
  chooseStyle,
  finishAppearance,
  generateCard,
  generateStylePortraits,
  regenerationsLeft,
  removePhoto,
  saveDescription,
  updateAppearance,
} from "../server/hero";
import { ValidationError } from "../server/projects";
import { getMarket, isMarketCode } from "@/config/markets";
import type { ProjectOptions } from "../model";
import { parseAppearance } from "./schemas";
import { projectAction, userAgent, type ActionResult } from "./common";

async function heroOf(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) throw new Error("Projekt nemá hrdinu");
  return { bundle, hero: bundle.hero };
}

/** Tri samostatné súhlasy pred nahratím fotky (K2.3) – každý sa uloží zvlášť. */
export async function savePhotoConsentsAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const { bundle, hero } = await heroOf(id);
    const market = isMarketCode(bundle.project.market) ? getMarket(bundle.project.market) : null;
    if (!market) throw new Error("Neznámy trh");
    await recordConsents(
      id,
      PHOTO_CONSENTS.map((c) => ({ ...c, granted: true, characterId: hero.id })),
      { language: market.uiLanguage, userAgent: await userAgent() }
    );
  });
}

export async function removePhotoAction(projectId: string, photoId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const bundle = await loadBundle(id);
    const ids = [bundle?.hero, ...(bundle?.companions ?? [])].filter(Boolean).map((c) => c!.id);
    await removePhoto(ids, String(photoId));
  });
}

/** Cesta bez fotky: hrdina z opisu (K2.4). */
export async function saveDescriptionAction(projectId: string, appearance: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const { hero } = await heroOf(id);
    await saveDescription(hero.id, parseAppearance(appearance));
  });
}

/** Pokračovať z kroku 2 – portréty vo všetkých štýloch sa začnú kresliť na pozadí. */
export async function finishPhotoStepAction(projectId: string, source: "photo" | "description"): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const { bundle, hero } = await heroOf(id);
    if (source === "photo" && !bundle.photos.some((p) => p.characterId === hero.id && (p.verdict === "good" || p.verdict === "ok"))) {
      throw new ValidationError("photo.subtitle");
    }
    if (await finishAppearance(id, source)) after(() => generateStylePortraits(id));
  });
}

export async function chooseStyleAction(projectId: string, style: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    if (!STYLES.includes(style as StyleId)) throw new ValidationError("error.generic");
    await chooseStyle(id, style as StyleId);
  });
}

const REASONS = ["face", "hair", "age", "expression"] as const;

/** „Skúsiť znova“ s dôvodom – 3 pokusy v cene, počítadlo je viditeľné (K3.3). */
const retrySchema = z.object({
  reasons: z.array(z.enum(REASONS)).max(REASONS.length),
  /** Vlastnými slovami, čo nesedí – ide len do obrazového modelu (nie do textového, S13). */
  note: z.string().trim().max(200),
});

/** Pregenerovanie Karty: aspoň jeden dôvod alebo vlastný opis. */
export async function retryCardAction(projectId: string, input: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = retrySchema.safeParse(input);
    if (!parsed.success || (parsed.data.reasons.length === 0 && !parsed.data.note)) throw new ValidationError("hero.retry.reason.title");
    const { reasons, note } = parsed.data;
    const { bundle, hero } = await heroOf(id);
    if (!bundle.project.styleId) throw new ValidationError("style.title");
    if (regenerationsLeft(bundle, hero.id, bundle.project.styleId) <= 0) throw new ValidationError("limit.retry_hero");
    await generateCard({
      projectId: id,
      characterId: hero.id,
      style: bundle.project.styleId as StyleId,
      reason: [...reasons, ...(note ? ["other"] : [])].join(","),
      feedback: { reasons, ...(note ? { note } : {}) },
    });
  });
}

export async function updateAppearanceAction(projectId: string, characterId: string, patch: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    await updateAppearance(id, String(characterId), parseAppearance(patch));
  });
}

export async function approveHeroAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    await approveHeroCard(id);
  });
}

/** „Nechajte to na nás“ – grafik pripraví podobu do 1 pracovného dňa (servisný prípad). */
export async function requestManualHeroAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const { bundle } = await heroOf(id);
    await db
      .update(schema.projects)
      .set({ options: { ...bundle.options, heroManualRequestedAt: new Date().toISOString() } satisfies ProjectOptions })
      .where(eq(schema.projects.id, id));
    await db.insert(schema.auditLog).values({ actor: "customer", action: "hero_manual_requested", subjectType: "project", subjectId: id });
  });
}
