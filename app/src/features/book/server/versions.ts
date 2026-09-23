import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  ACTIVITIES,
  BOOK_FORMATS,
  COVER_DESIGNS,
  LAYOUT_IMAGE_RATIO,
  LAYOUTS,
  PAGE_COUNTS,
  READING_LEVELS,
  STYLES,
  type StyleId,
} from "@/config/catalog";
import { isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import type { StorySpread } from "@/db/schema";
import { isBookLanguage } from "@/i18n/locales";
import { guessNameForms, type NameContext, type NameForms } from "@/lib/language";

import { ENDPAPERS, FONT_PAIRS, THEMES, TITLE_POSITIONS } from "../design";
import { buildBook, type BookInput } from "../model/build";
import { defaultBookOptions } from "../model/options";
import type { BackCoverData, Book, BookImage, BookMeta, BookOptions, BookPart, CoverData } from "../model/types";
import { generateScene } from "./illustrations";

/*
  Verzie knihy v DB (book_versions + book_pages). Verzia je uzamknutý snímok:
  každá časť má v book_pages.data celý obsah strany, takže náhľad, e-kniha aj
  tlač z nej vzniknú rovnako aj po zmene kódu generátorov.

  Kontrakt s balíkom A (projects):
    - projects.options: voľby kroku 6 v tvare BookOptions (cover, theme, fontPair,
      titlePosition, endpaper, frames, activities, parentGuide, parentLetter,
      backPortrait, readingLevel); chýbajúce = predvolené podľa veku
    - projects.personalTexts: { dedication?, from?, date?, parentLetter?, backText? }
    - projects.storyInput.story: pri cestách C a D hotový text
      { title, annotation, spreads: [{ text, scene }], questions? } (značky {meno:X})
*/

/** Verzia formátu snímky – pri zmene tvaru BookPart zvýšiť a doplniť migráciu čítania. */
const SNAPSHOT_FORMAT = 1;

type Snapshot = {
  format: number;
  meta: BookMeta;
  options: BookOptions;
  cover: CoverData;
  back: BackCoverData;
  sources: Record<string, unknown>;
};

// ---------------------------------------------------------------- vstupy z projektu

const optionsSchema = z
  .object({
    cover: z.enum(COVER_DESIGNS),
    theme: z.enum(THEMES),
    fontPair: z.enum(FONT_PAIRS),
    titlePosition: z.enum(TITLE_POSITIONS),
    endpaper: z.enum(ENDPAPERS),
    frames: z.boolean(),
    activities: z.array(z.enum(ACTIVITIES)).length(4),
    parentGuide: z.boolean(),
    parentLetter: z.boolean(),
    backPortrait: z.boolean(),
    readingLevel: z.enum(READING_LEVELS),
    binding: z.enum(["hardcover", "softcover"]),
  })
  .partial();

const personalSchema = z
  .object({
    dedication: z.string(),
    from: z.string(),
    date: z.string(),
    parentLetter: z.string(),
    backText: z.string(),
  })
  .partial();

const customStorySchema = z.object({
  title: z.string(),
  annotation: z.string(),
  spreads: z.array(z.object({ text: z.string(), scene: z.string().optional(), fallbackText: z.string().optional() })),
  questions: z.array(z.string()).optional(),
});

/** Kľúč obrázka z Karty – mock/B ukladajú { storageKey } alebo priamo reťazec. */
function imageKey(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "storageKey" in value && typeof value.storageKey === "string") {
    return value.storageKey;
  }
  return null;
}

/** Adresa osobnej stránky knihy za QR kódom. PLACEHOLDER – tvar odkazu a token určí balík D. */
export function personalPageUrl(market: string, projectId: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/${market}/k/${projectId}`;
}

export class BookVersionError extends Error {}

/**
 * Zostaví novú verziu knihy z projektu (krok 6 → „Vygenerovať knihu“): ilustrácie
 * scén cez ImageProvider (zatiaľ mock), model strán, uloženie. Stav projektu nemení –
 * to robí volajúci cez assertTransition.
 */
export async function createBookVersion(projectId: string): Promise<{ versionId: string; book: Book }> {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
  if (!project) throw new BookVersionError("Projekt neexistuje");
  if (!isBookLanguage(project.bookLanguage) || !isMarketCode(project.market)) {
    throw new BookVersionError("Neznámy jazyk alebo trh projektu");
  }
  const language = project.bookLanguage;

  const hero = await db.query.characters.findFirst({
    where: and(eq(schema.characters.projectId, projectId), eq(schema.characters.role, "hero")),
  });
  if (!hero?.gender) throw new BookVersionError("Projekt nemá hrdinu s rodom");
  const forms = (hero.nameForms as NameForms | null) ?? guessNameForms(hero.name, hero.gender, language).forms;
  const name: NameContext = { forms, gender: hero.gender, declinable: !hero.nameIndeclinable };

  const card = await db.query.characterCards.findFirst({
    where: and(eq(schema.characterCards.characterId, hero.id), eq(schema.characterCards.status, "approved")),
    orderBy: desc(schema.characterCards.version),
  });
  const cardImages = (card?.images ?? {}) as Record<string, unknown>;
  const portraitKey = imageKey(cardImages.portrait);
  const fullBodyKey = imageKey(cardImages.fullBody);

  // Text príbehu: knižnica (A, B) alebo hotový text na mieru (C, D).
  let story: BookInput["story"];
  let sources: Record<string, unknown>;
  const custom = customStorySchema.safeParse((project.storyInput as { story?: unknown } | null)?.story);
  if ((project.storyPath === "C" || project.storyPath === "D") && custom.success) {
    story = { ...custom.data, author: null };
    sources = { storyPath: project.storyPath };
  } else {
    if (!project.storyId) throw new BookVersionError("Projekt nemá vybraný príbeh");
    const edition = await db.query.storyEditions.findFirst({
      where: and(eq(schema.storyEditions.storyId, project.storyId), eq(schema.storyEditions.language, language)),
      orderBy: desc(schema.storyEditions.version),
    });
    if (!edition) throw new BookVersionError(`Príbeh nemá edíciu v jazyku ${language}`);
    story = {
      title: edition.title,
      annotation: edition.annotation,
      spreads: edition.spreads as StorySpread[],
      developmentGoal: edition.developmentGoal,
      author: edition.author,
    };
    sources = { storyPath: project.storyPath ?? "A", storyId: project.storyId, editionId: edition.id, editionVersion: edition.version };
  }

  const style: StyleId = STYLES.includes(project.styleId as StyleId) ? (project.styleId as StyleId) : "watercolor";
  const layout = LAYOUTS.find((l) => l === project.layoutId);
  const format = BOOK_FORMATS.find((f) => f === project.format) ?? "A5";
  const pageCount = PAGE_COUNTS.find((p) => p === project.pageCount) ?? 32;
  const parsedOptions = optionsSchema.safeParse(project.options);
  const options: BookOptions = {
    ...defaultBookOptions({ age: hero.age ?? 5, style, format, pageCount, layout }),
    ...(parsedOptions.success ? parsedOptions.data : {}),
  };
  const personal = personalSchema.safeParse(project.personalTexts ?? {});

  // Ilustrácie scén v pomere layoutu – s kľúčmi Kariet, bez fotiek (S13).
  const aspect = LAYOUT_IMAGE_RATIO[options.layout];
  const characterCardKeys = [portraitKey, fullBodyKey].filter((k): k is string => Boolean(k));
  const scenes = await Promise.all(
    story.spreads.map((spread) =>
      generateScene(projectId, { style, aspect, scene: spread.scene ?? "", characterCardKeys })
    )
  );

  const book = buildBook({
    language,
    seed: projectId,
    hero: { name, age: hero.age ?? 5 },
    story,
    options,
    personal: personal.success ? personal.data : undefined,
    images: {
      spreads: scenes,
      heroFullBody: fullBodyKey ? { key: fullBodyKey } : null,
      heroPortrait: portraitKey ? { key: portraitKey } : null,
    },
    meta: { personalPageUrl: personalPageUrl(project.market, projectId), date: new Date().toISOString().slice(0, 10) },
  });

  const versionId = await saveBookVersion(projectId, book, { ...sources, style, aspect });
  return { versionId, book };
}

// ---------------------------------------------------------------- uloženie a načítanie

const stripSrc = (image: BookImage | null): BookImage | null => (image ? { key: image.key } : null);

function partRow(part: BookPart) {
  switch (part.kind) {
    case "story_spread":
      return { kind: part.kind, text: part.text, layoutId: part.layout, illustrationKey: part.illustration?.key ?? null };
    case "title":
      return { kind: part.kind, text: part.dedication ?? null, layoutId: null, illustrationKey: null };
    case "activity":
      return { kind: `activity:${part.activity}`, text: part.heading, layoutId: null, illustrationKey: null };
    case "parent_letter":
      return { kind: part.kind, text: part.text, layoutId: null, illustrationKey: null };
    default:
      return { kind: part.kind, text: null, layoutId: null, illustrationKey: null };
  }
}

export async function saveBookVersion(projectId: string, book: Book, sources: Record<string, unknown> = {}) {
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ version: schema.bookVersions.version })
      .from(schema.bookVersions)
      .where(eq(schema.bookVersions.projectId, projectId))
      .orderBy(desc(schema.bookVersions.version))
      .limit(1);

    const snapshot: Snapshot = {
      format: SNAPSHOT_FORMAT,
      meta: book.meta,
      options: book.options,
      cover: { ...book.cover, hero: stripSrc(book.cover.hero), portrait: stripSrc(book.cover.portrait), scene: stripSrc(book.cover.scene) },
      back: { ...book.back, portrait: stripSrc(book.back.portrait) },
      sources,
    };
    const [version] = await tx
      .insert(schema.bookVersions)
      .values({ projectId, version: (last?.version ?? 0) + 1, snapshot })
      .returning({ id: schema.bookVersions.id });

    // position 0 = obálka, 1…n = časti vnútra, n+1 = zadná strana.
    const rows = [
      { position: 0, kind: "cover", text: book.cover.title, data: null, layoutId: null, illustrationKey: book.cover.scene?.key ?? null },
      ...book.parts.map((part, i) => {
        const clean = part.kind === "story_spread" ? { ...part, illustration: stripSrc(part.illustration) } : part;
        return { position: i + 1, ...partRow(part), data: clean as unknown as Record<string, unknown> };
      }),
      { position: book.parts.length + 1, kind: "back_cover", text: book.back.text, data: null, layoutId: null, illustrationKey: null },
    ];
    await tx.insert(schema.bookPages).values(
      rows.map((row) => ({
        bookVersionId: version.id,
        position: row.position,
        kind: row.kind,
        text: row.text,
        data: row.data,
        layoutId: row.layoutId,
        illustrationKey: row.illustrationKey,
        status: "ready" as const,
      }))
    );
    return version.id;
  });
}

export async function loadBookVersion(versionId: string): Promise<Book | null> {
  const version = await db.query.bookVersions.findFirst({ where: eq(schema.bookVersions.id, versionId) });
  if (!version) return null;
  const snapshot = version.snapshot as unknown as Snapshot;
  if (snapshot.format !== SNAPSHOT_FORMAT) throw new BookVersionError(`Nepodporovaný formát snímky ${snapshot.format}`);

  const pages = await db
    .select()
    .from(schema.bookPages)
    .where(eq(schema.bookPages.bookVersionId, versionId))
    .orderBy(asc(schema.bookPages.position));

  const parts: BookPart[] = [];
  const status: NonNullable<Book["status"]> = {};
  for (const page of pages) {
    if (page.kind === "cover" || page.kind === "back_cover" || !page.data) continue;
    const index = parts.length;
    parts.push(page.data as unknown as BookPart);
    if (page.status === "pending" || page.status === "generating") status[index] = "pending";
    if (page.status === "needs_review" || page.status === "failed") status[index] = "needs_review";
  }

  return {
    meta: snapshot.meta,
    options: snapshot.options,
    cover: snapshot.cover,
    back: snapshot.back,
    parts,
    status: Object.keys(status).length > 0 ? status : undefined,
  };
}

/** Uzamknutie verzie po schválení (z nej sa robí e-kniha a tlač). */
export async function lockBookVersion(versionId: string) {
  await db.update(schema.bookVersions).set({ lockedAt: new Date() }).where(eq(schema.bookVersions.id, versionId));
}
