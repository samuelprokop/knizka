import "server-only";

import { and, eq } from "drizzle-orm";

import { CHARACTER_KINDS, GUIDE_ANIMALS, MAX_EXTRA_CHARACTERS, type CharacterKind, type GuideKind, type StyleId } from "@/config/catalog";
import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import type { Gender, NameForms } from "@/lib/language";
import { resolveName } from "@/lib/language/resolve";
import { loadBundle } from "./bundle";
import { generateCard } from "./hero";
import { changeRegeneratesBook, rewindStatus } from "../status";
import type { Appearance, ProjectOptions } from "../model";
import { capitalizeName, validateChildName } from "../validation";
import { ValidationError } from "./projects";

/** Rod postavy podľa typu – pri súrodencovi, kamarátovi a „inom“ sa pýtame. */
export function genderForKind(kind: CharacterKind): Gender | null {
  if (kind === "mother" || kind === "grandmother") return "girl";
  if (kind === "father" || kind === "grandfather") return "boy";
  return null;
}

export type CompanionInput = {
  kind: CharacterKind;
  name: string;
  gender: Gender;
  storyRole: "companion" | "cameo";
  appearance: Appearance;
  editedForms: NameForms | null;
  indeclinable: boolean;
  /** Podoba z fotky (nahrá sa po založení postavy), inak z opisu. */
  withPhoto: boolean;
};

async function namePayload(input: { name: string; gender: Gender; editedForms: NameForms | null; indeclinable: boolean }, language: BookLanguage) {
  const error = validateChildName(input.name);
  if (error) throw new ValidationError(error);
  const name = capitalizeName(input.name);
  const resolved = await resolveName(name, language, input.gender);
  return {
    name: resolved.source === "dictionary" ? resolved.name : name,
    nameForms: input.editedForms ?? resolved.forms,
    nameIndeclinable: input.indeclinable || !resolved.declinable,
    needsReview: resolved.source === "rules" || !resolved.verified || !!input.editedForms,
  };
}

async function markChanged(projectId: string, needsReview: boolean) {
  const bundle = await loadBundle(projectId);
  if (!bundle) return;
  // Postava pridaná po vygenerovaní = nové generovanie dotknutých strán (proces: Krok 4).
  const status = changeRegeneratesBook(bundle.project.status)
    ? rewindStatus(bundle.project.status, "text_approved")
    : bundle.project.status;
  await db
    .update(schema.projects)
    .set({ status, needsLanguageReview: bundle.project.needsLanguageReview || needsReview, lastActivityAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

export async function addCompanion(projectId: string, input: CompanionInput) {
  if (!CHARACTER_KINDS.includes(input.kind)) throw new ValidationError("chars.type.label");
  const bundle = await loadBundle(projectId);
  if (!bundle?.project.styleId) throw new Error("Chýba štýl");
  if (bundle.companions.length >= MAX_EXTRA_CHARACTERS) throw new ValidationError("chars.limit");

  const name = await namePayload(input, bundle.project.bookLanguage as BookLanguage);
  const [character] = await db
    .insert(schema.characters)
    .values({
      projectId,
      role: "companion",
      kind: input.kind,
      name: name.name,
      nameForms: name.nameForms,
      nameIndeclinable: name.nameIndeclinable,
      gender: input.gender,
      storyRole: input.storyRole,
      appearanceSource: input.withPhoto ? "photo" : "description",
      appearance: input.appearance,
      sortOrder: bundle.companions.length + 1,
    })
    .returning();

  await markChanged(projectId, name.needsReview);
  await setCharactersDecided(projectId, true);
  return character;
}

/** Karta postavy vznikne v zvolenom štýle; volá sa po nahratí fotky alebo hneď pri opise. */
export async function generateCompanionCard(projectId: string, characterId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.project.styleId) throw new Error("Chýba štýl");
  await generateCard({ projectId, characterId, style: bundle.project.styleId as StyleId });
}

export async function approveCompanionCard(projectId: string, characterId: string) {
  const bundle = await loadBundle(projectId);
  const card = bundle?.cards.find((c) => c.characterId === characterId && c.version >= 1);
  if (!bundle || !card || !bundle.companions.some((c) => c.id === characterId)) throw new Error("Karta nepatrí k projektu");
  await db
    .update(schema.characterCards)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(schema.characterCards.id, card.id));
}

export async function removeCompanion(projectId: string, characterId: string) {
  await db
    .delete(schema.characters)
    .where(and(eq(schema.characters.id, characterId), eq(schema.characters.projectId, projectId), eq(schema.characters.role, "companion")));
  await markChanged(projectId, false);
}

async function setCharactersDecided(projectId: string, decided: boolean) {
  const bundle = await loadBundle(projectId);
  if (!bundle) return;
  await db
    .update(schema.projects)
    .set({ options: { ...bundle.options, charactersDecided: decided } satisfies ProjectOptions })
    .where(eq(schema.projects.id, projectId));
}

/** „Nie, len {meno}“ – krok sa preskočí, sprievodca ostáva predvolený (K4.1). */
export async function onlyHero(projectId: string) {
  await setCharactersDecided(projectId, true);
}

export type GuideInput =
  | { kind: "mascot" }
  | { kind: "none" }
  | { kind: "animal"; animal: (typeof GUIDE_ANIMALS)[number]; name: string; gender: Gender };

/** Sprievodca: maskot značky (predvolené), zvieratko s menom, alebo bez (K4.3). */
export async function setGuide(projectId: string, input: GuideInput) {
  const bundle = await loadBundle(projectId);
  if (!bundle) throw new Error("Projekt neexistuje");
  const previous = bundle.options.guide ?? "mascot";

  await db
    .delete(schema.characters)
    .where(and(eq(schema.characters.projectId, projectId), eq(schema.characters.role, "guide")));

  if (input.kind === "animal") {
    if (!GUIDE_ANIMALS.includes(input.animal)) throw new ValidationError("guide.animal.options");
    const name = await namePayload(
      { name: input.name, gender: input.gender, editedForms: null, indeclinable: false },
      bundle.project.bookLanguage as BookLanguage
    );
    const [guide] = await db
      .insert(schema.characters)
      .values({
        projectId,
        role: "guide",
        kind: input.animal,
        name: name.name,
        nameForms: name.nameForms,
        nameIndeclinable: name.nameIndeclinable,
        gender: input.gender,
        appearanceSource: "description",
        appearance: { petKind: input.animal },
      })
      .returning();
    if (bundle.project.styleId) await generateCard({ projectId, characterId: guide.id, style: bundle.project.styleId as StyleId });
  }

  const kind: GuideKind = input.kind;
  await db
    .update(schema.projects)
    .set({ options: { ...bundle.options, guide: kind } satisfies ProjectOptions })
    .where(eq(schema.projects.id, projectId));
  if (kind !== previous || kind === "animal") await markChanged(projectId, false);
}
