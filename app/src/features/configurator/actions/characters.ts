"use server";

import { z } from "zod";

import { CHARACTER_KINDS, GUIDE_ANIMALS } from "@/config/catalog";
import { getMarket, isMarketCode } from "@/config/markets";
import { loadBundle } from "../server/bundle";
import {
  addCompanion,
  approveCompanionCard,
  generateCompanionCard,
  onlyHero,
  removeCompanion,
  setGuide,
} from "../server/characters";
import { recordConsents } from "../server/consents";
import { ValidationError } from "../server/projects";
import { projectAction, userAgent, type ActionResult } from "./common";
import { parseAppearance } from "./schemas";

const form = z.string().trim().min(1).max(24);

const companionSchema = z.object({
  kind: z.enum(CHARACTER_KINDS),
  name: z.string().max(40),
  gender: z.enum(["girl", "boy"]),
  storyRole: z.enum(["companion", "cameo"]),
  appearance: z.unknown(),
  editedForms: z.object({ N: form, G: form, D: form, A: form, V: form, L: form, I: form }).nullable(),
  indeclinable: z.boolean(),
  /** Pri fotke inej osoby: vyhlásenie o jej súhlase (K4.2). */
  otherPersonConsent: z.boolean(),
  withPhoto: z.boolean(),
});

export async function onlyHeroAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, onlyHero);
}

/** Pridá postavu; pri ceste s fotkou vracia id, aby klient nahral fotku a potom dal vytvoriť Kartu. */
export async function addCompanionAction(projectId: string, input: unknown): Promise<ActionResult<{ characterId: string }>> {
  return projectAction(projectId, async (id) => {
    const parsed = companionSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("child.name.invalid_chars");
    const data = parsed.data;
    if (data.withPhoto && !data.otherPersonConsent) throw new ValidationError("chars.consent.other_person");

    const character = await addCompanion(id, { ...data, appearance: parseAppearance(data.appearance) });
    if (data.withPhoto) {
      const bundle = await loadBundle(id);
      const market = bundle && isMarketCode(bundle.project.market) ? getMarket(bundle.project.market) : null;
      await recordConsents(
        id,
        [{ type: "other_person_photo", granted: true, textKey: "chars.consent.other_person", characterId: character.id }],
        { language: market?.uiLanguage ?? "sk", userAgent: await userAgent() }
      );
    } else {
      await generateCompanionCard(id, character.id);
    }
    return { characterId: character.id };
  });
}

/** Po nahratí fotky postavy (alebo pri zlyhaní fotky – z opisu). */
export async function generateCompanionCardAction(projectId: string, characterId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const bundle = await loadBundle(id);
    if (!bundle?.companions.some((c) => c.id === characterId)) throw new ValidationError("error.generic");
    await generateCompanionCard(id, characterId);
  });
}

export async function approveCompanionAction(projectId: string, characterId: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => approveCompanionCard(id, String(characterId)));
}

export async function removeCompanionAction(projectId: string, characterId: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => removeCompanion(id, String(characterId)));
}

const guideSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mascot") }),
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("animal"), animal: z.enum(GUIDE_ANIMALS), name: z.string().max(40), gender: z.enum(["girl", "boy"]) }),
]);

export async function setGuideAction(projectId: string, input: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = guideSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("child.name.invalid_chars");
    await setGuide(id, parsed.data);
  });
}
