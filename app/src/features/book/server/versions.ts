import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  ACTIVITIES,
  ACTIVITY_PICK_COUNT,
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
import { renderDetails } from "../model/text";
import type { BackCoverData, Book, BookImage, BookMeta, BookOptions, BookPart, CoverData, StorySpreadPart } from "../model/types";
import { generateScene } from "./illustrations";

/*
  Verzie knihy v DB (book_versions + book_pages). Verzia je uzamknutý snímok:
  každá časť má v book_pages.data celý obsah strany, takže náhľad, e-kniha aj
  tlač z nej vzniknú rovnako aj po zmene kódu generátorov.

  Kontrakt s balíkom A (projects) – tvar, ktorý ukladá konfigurátor:
    - projects.options.look: voľby kroku 6 (cover, theme, fontPair, titlePosition,
      endpaper, frames, activities, parentGuide, parentLetter, backPortrait);
      projects.options.readingLevel a .bookTitle; chýbajúce/neplatné = predvolené
    - projects.personalTexts: { dedication?, from?, date?, letter?, back? }
    - projects.storyInput.generated: pri cestách C a D hotový text
      { title, annotation, spreads: [{ text, scene }] } (značky {meno:X})
    - projects.storyInput.details: vlastné detaily cesty B ({detail:slot|…})
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

const lookFields = {
  cover: z.enum(COVER_DESIGNS),
  theme: z.enum(THEMES),
  fontPair: z.enum(FONT_PAIRS),
  titlePosition: z.enum(TITLE_POSITIONS),
  endpaper: z.enum(ENDPAPERS),
  frames: z.boolean(),
  parentGuide: z.boolean(),
  parentLetter: z.boolean(),
  backPortrait: z.boolean(),
  readingLevel: z.enum(READING_LEVELS),
  binding: z.enum(["hardcover", "softcover"]),
};

/** Každá voľba sa overí zvlášť – jedna neplatná hodnota nezhodí ostatné na predvolené. */
function parseLook(raw: Record<string, unknown>, defaults: BookOptions): BookOptions {
  const options = { ...defaults } as Record<string, unknown>;
  for (const [key, schema] of Object.entries(lookFields)) {
    const parsed = schema.safeParse(raw[key]);
    if (parsed.success) options[key] = parsed.data;
  }
  // Presne 4 rôzne aktivity: zvolené zákazníkom, doplnené predvolenými podľa veku.
  const chosen = z.array(z.enum(ACTIVITIES)).safeParse(raw.activities);
  const picked = [...new Set(chosen.success ? chosen.data : defaults.activities)];
  for (const activity of [...defaults.activities, ...ACTIVITIES]) {
    if (picked.length >= ACTIVITY_PICK_COUNT) break;
    if (!picked.includes(activity)) picked.push(activity);
  }
  options.activities = picked.slice(0, ACTIVITY_PICK_COUNT);
  return options as BookOptions;
}

const personalSchema = z
  .object({
    dedication: z.string(),
    from: z.string(),
    date: z.string(),
    letter: z.string(),
    back: z.string(),
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
 * Zostaví novú verziu knihy z projektu (krok 6 → „Vygenerovať knihu“): model strán
 * a uloženie. Stav projektu nemení – to robí volajúci cez assertTransition.
 *
 * illustrations: "now" = ilustrácie scén sa vygenerujú hneď (demo, testy);
 * "later" = dvojstrany sa uložia bez obrázka so stavom "pending" a konfigurátor
 * ich generuje po jednej (krok 7), každú cez withSpreadChanges + setCoverScene.
 */
export async function createBookVersion(
  projectId: string,
  opts: { illustrations?: "now" | "later" } = {}
): Promise<{ versionId: string; book: Book }> {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
  if (!project) throw new BookVersionError("Projekt neexistuje");
  if (!isBookLanguage(project.bookLanguage) || !isMarketCode(project.market)) {
    throw new BookVersionError("Neznámy jazyk alebo trh projektu");
  }
  const language = project.bookLanguage;
  const projectOptions = (project.options ?? {}) as { look?: Record<string, unknown>; readingLevel?: unknown; bookTitle?: unknown };
  const storyInput = (project.storyInput ?? {}) as { generated?: unknown; story?: unknown; details?: Record<string, string> };

  const characters = await db.query.characters.findMany({ where: eq(schema.characters.projectId, projectId) });
  const hero = characters.find((c) => c.role === "hero");
  if (!hero?.gender) throw new BookVersionError("Projekt nemá hrdinu s rodom");
  const forms = (hero.nameForms as NameForms | null) ?? guessNameForms(hero.name, hero.gender, language).forms;
  const name: NameContext = { forms, gender: hero.gender, declinable: !hero.nameIndeclinable };

  // Schválené Karty všetkých postáv – hrdina, spoločníci aj sprievodca (bez fotiek, S13).
  const approvedCards = await Promise.all(
    characters.map((c) =>
      db.query.characterCards.findFirst({
        where: and(eq(schema.characterCards.characterId, c.id), eq(schema.characterCards.status, "approved")),
        orderBy: desc(schema.characterCards.version),
      })
    )
  );
  const heroCard = approvedCards[characters.indexOf(hero)];
  const cardImages = (heroCard?.images ?? {}) as Record<string, unknown>;
  const portraitKey = imageKey(cardImages.portrait);
  const fullBodyKey = imageKey(cardImages.fullBody);

  // Text príbehu: knižnica (A, B) alebo hotový text na mieru (C, D).
  let story: BookInput["story"];
  let sources: Record<string, unknown>;
  const custom = customStorySchema.safeParse(storyInput.generated ?? storyInput.story);
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

  // Vlastné detaily (cesta B) a vlastný názov knihy (K5.11).
  const details = storyInput.details ?? {};
  const bookTitle = typeof projectOptions.bookTitle === "string" ? projectOptions.bookTitle.trim() : "";
  story = {
    ...story,
    title: bookTitle || renderDetails(story.title, details),
    annotation: renderDetails(story.annotation, details),
    spreads: story.spreads.map((spread) => ({
      ...spread,
      text: renderDetails(spread.text, details),
      fallbackText: spread.fallbackText ? renderDetails(spread.fallbackText, details) : undefined,
    })),
  };

  const style: StyleId = STYLES.includes(project.styleId as StyleId) ? (project.styleId as StyleId) : "watercolor";
  const layout = LAYOUTS.find((l) => l === project.layoutId);
  const format = BOOK_FORMATS.find((f) => f === project.format) ?? "A5";
  const pageCount = PAGE_COUNTS.find((p) => p === project.pageCount) ?? 32;
  const options = parseLook(
    { ...(projectOptions.look ?? {}), readingLevel: projectOptions.readingLevel },
    defaultBookOptions({ age: hero.age ?? 5, style, format, pageCount, layout })
  );
  const personal = personalSchema.safeParse(project.personalTexts ?? {});
  const texts = personal.success ? personal.data : {};

  // Ilustrácie scén v pomere layoutu – s kľúčmi Kariet, bez fotiek (S13).
  const aspect = LAYOUT_IMAGE_RATIO[options.layout];
  const characterCardKeys = approvedCards
    .map((card) => imageKey(((card?.images ?? {}) as Record<string, unknown>).portrait))
    .filter((k): k is string => Boolean(k));
  const later = opts.illustrations === "later";
  const scenes = later
    ? story.spreads.map(() => null)
    : await Promise.all(
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
    personal: {
      dedication: texts.dedication,
      from: texts.from,
      date: texts.date,
      parentLetter: texts.letter,
      backText: texts.back,
    },
    images: {
      spreads: scenes,
      heroFullBody: fullBodyKey ? { key: fullBodyKey } : null,
      heroPortrait: portraitKey ? { key: portraitKey } : null,
    },
    meta: { personalPageUrl: personalPageUrl(project.market, projectId), date: new Date().toISOString().slice(0, 10) },
  });

  const versionId = await saveBookVersion(
    projectId,
    book,
    { ...sources, style, aspect },
    { scenes: story.spreads.map((spread) => spread.scene ?? ""), pendingIllustrations: later }
  );
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

export async function saveBookVersion(
  projectId: string,
  book: Book,
  sources: Record<string, unknown> = {},
  /** scenes: opis scény každej dvojstrany (pre generovanie po stranách); pendingIllustrations: dvojstrany bez obrázka čakajú. */
  extra: { scenes?: string[]; pendingIllustrations?: boolean } = {}
) {
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
      rows.map((row) => {
        const spread = row.kind === "story_spread" ? (row.data as unknown as StorySpreadPart).spread : null;
        const waiting = spread !== null && extra.pendingIllustrations && !row.illustrationKey;
        return {
          bookVersionId: version.id,
          position: row.position,
          kind: row.kind,
          text: row.text,
          data: row.data,
          layoutId: row.layoutId,
          illustrationKey: row.illustrationKey,
          qa: spread !== null && extra.scenes ? { scene: extra.scenes[spread] ?? "" } : null,
          status: waiting ? ("pending" as const) : ("ready" as const),
        };
      })
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

/** Obálka „hrdina v scéne“ používa ilustráciu prvej dvojstrany – po jej (pre)generovaní sa obnoví. */
export async function setCoverScene(versionId: string, key: string | null) {
  const version = await db.query.bookVersions.findFirst({ where: eq(schema.bookVersions.id, versionId) });
  if (!version) return;
  const snapshot = version.snapshot as unknown as Snapshot;
  const scene = key ? { key } : null;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookVersions)
      .set({ snapshot: { ...snapshot, cover: { ...snapshot.cover, scene } } as unknown as Record<string, unknown> })
      .where(eq(schema.bookVersions.id, versionId));
    await tx
      .update(schema.bookPages)
      .set({ illustrationKey: key })
      .where(and(eq(schema.bookPages.bookVersionId, versionId), eq(schema.bookPages.kind, "cover")));
  });
}
