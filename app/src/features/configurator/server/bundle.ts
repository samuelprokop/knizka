import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, schema } from "@/db";
import type { ProjectStatus } from "@/domain/project-status";
import type { NameContext, NameForms } from "@/lib/language";
import type { ProjectOptions, StoryInput, PersonalTexts, Appearance } from "../model";
import type { ProgressFacts } from "../steps";

export type Project = typeof schema.projects.$inferSelect;
export type Character = typeof schema.characters.$inferSelect;
export type Photo = typeof schema.photos.$inferSelect;
export type Card = typeof schema.characterCards.$inferSelect;
export type BookVersion = typeof schema.bookVersions.$inferSelect;
export type BookPage = typeof schema.bookPages.$inferSelect;

/** Všetko, čo krok konfigurátora potrebuje o projekte – jedno načítanie. */
export type ProjectBundle = {
  project: Project;
  options: ProjectOptions;
  storyInput: StoryInput;
  personalTexts: PersonalTexts;
  hero: Character | null;
  companions: Character[];
  guide: Character | null;
  /** Fotky, ktoré ešte neboli zmazané. */
  photos: Photo[];
  /** Karty podľa postavy, najnovšia prvá; verzia 0 = portrét na výber štýlu (krok 3). */
  cards: Card[];
  book: BookVersion | null;
  pages: BookPage[];
};

export async function loadBundle(projectId: string): Promise<ProjectBundle | null> {
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!project || project.status === "deleted") return null;

  const characters = await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.projectId, projectId))
    .orderBy(asc(schema.characters.sortOrder), asc(schema.characters.createdAt));
  const ids = characters.map((c) => c.id);

  const [photos, cards, [book]] = await Promise.all([
    ids.length
      ? db
          .select()
          .from(schema.photos)
          .where(and(inArray(schema.photos.characterId, ids), isNull(schema.photos.deletedAt)))
          .orderBy(asc(schema.photos.uploadedAt))
      : [],
    ids.length
      ? db
          .select()
          .from(schema.characterCards)
          .where(inArray(schema.characterCards.characterId, ids))
          .orderBy(desc(schema.characterCards.version), desc(schema.characterCards.createdAt))
      : [],
    db
      .select()
      .from(schema.bookVersions)
      .where(eq(schema.bookVersions.projectId, projectId))
      .orderBy(desc(schema.bookVersions.version))
      .limit(1),
  ]);

  const pages = book
    ? await db
        .select()
        .from(schema.bookPages)
        .where(eq(schema.bookPages.bookVersionId, book.id))
        .orderBy(asc(schema.bookPages.position))
    : [];

  return {
    project,
    options: (project.options ?? {}) as ProjectOptions,
    storyInput: (project.storyInput ?? {}) as StoryInput,
    personalTexts: (project.personalTexts ?? {}) as PersonalTexts,
    hero: characters.find((c) => c.role === "hero") ?? null,
    companions: characters.filter((c) => c.role === "companion"),
    guide: characters.find((c) => c.role === "guide") ?? null,
    photos,
    cards,
    book: book ?? null,
    pages,
  };
}

// ---------------------------------------------------------------- odvodené údaje

const STATUS_ORDER: ProjectStatus[] = [
  "draft",
  "hero_approved",
  "text_approved",
  "generating",
  "preview",
  "approved_by_customer",
];

/** Stav je aspoň `min` (v poradí tvorby knihy). Stavy po platbe sa berú ako „viac“. */
export function statusAtLeast(status: ProjectStatus, min: ProjectStatus) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 || index >= STATUS_ORDER.indexOf(min);
}

export const photosOf = (b: ProjectBundle, characterId: string) => b.photos.filter((p) => p.characterId === characterId);

export const usablePhotos = (photos: Photo[]) => photos.filter((p) => p.verdict === "good" || p.verdict === "ok");

/** Portréty na výber štýlu (verzia 0) pre hrdinu. */
export const stylePortraits = (b: ProjectBundle) =>
  b.hero ? b.cards.filter((c) => c.characterId === b.hero!.id && c.version === 0) : [];

/** Aktuálna Karta postavy (najvyššia verzia ≥ 1), prípadne len v danom štýle. */
export const currentCard = (b: ProjectBundle, characterId: string, styleId?: string | null) =>
  b.cards.find((c) => c.characterId === characterId && c.version >= 1 && (!styleId || c.styleId === styleId)) ?? null;

export const appearanceOf = (c: Character | null): Appearance => (c?.appearance ?? {}) as Appearance;

export function hasHeroAppearance(b: ProjectBundle) {
  if (!b.hero?.appearanceSource) return false;
  if (b.hero.appearanceSource === "description") return true;
  // Po schválení Karty sa fotky mažú – podoba je už v Karte.
  return usablePhotos(photosOf(b, b.hero.id)).length > 0 || statusAtLeast(b.project.status, "hero_approved");
}

export function progressFacts(b: ProjectBundle): ProgressFacts {
  const status = b.project.status;
  return {
    hasHeroAppearance: hasHeroAppearance(b),
    heroApproved: statusAtLeast(status, "hero_approved"),
    storyChosen: statusAtLeast(status, "text_approved"),
    bookGenerated: statusAtLeast(status, "generating") && !!b.book,
    bookReady: statusAtLeast(status, "preview") && !!b.book,
  };
}

export function nameContextOf(c: Pick<Character, "nameForms" | "gender" | "nameIndeclinable" | "name">): NameContext {
  const forms = (c.nameForms as NameForms | null) ?? {
    N: c.name, G: c.name, D: c.name, A: c.name, V: c.name, L: c.name, I: c.name,
  };
  return { forms, gender: c.gender ?? "girl", declinable: !c.nameIndeclinable };
}
