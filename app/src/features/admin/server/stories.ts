import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import type { MarketCode } from "@/config/markets";
import type { StyleId } from "@/config/catalog";
import { LAYOUTS } from "@/config/catalog";
import { db, schema } from "@/db";
import type { StorySpread } from "@/db/schema";
import { LAYOUT_SPECS } from "@/features/book/design";
import type { SampleSpreadData } from "@/features/book/components/SampleSpread";
import { getSampleSpreadData } from "@/features/book/server/sample";
import type { BookLanguage } from "@/i18n/locales";
import { testHeroes, validateEditionTemplate, type EditionTemplate, type TemplateIssue, type TypesetSample } from "@/lib/language";
import type { StoryCategory } from "../story-categories";

export type Story = typeof schema.stories.$inferSelect;
export type Edition = typeof schema.storyEditions.$inferSelect;

export { CATEGORY_LABELS, STORY_CATEGORIES, type StoryCategory } from "../story-categories";

export type StoryWithEditions = { story: Story; editions: Partial<Record<BookLanguage, Edition>> };

/** Všetky príbehy s najnovšou edíciou v každom jazyku (administrácia vidí aj nepublikované). */
export async function listStories(): Promise<StoryWithEditions[]> {
  const stories = await db.select().from(schema.stories).orderBy(asc(schema.stories.category), asc(schema.stories.slug));
  const editions = await db.select().from(schema.storyEditions).orderBy(desc(schema.storyEditions.version));

  return stories.map((story) => {
    const forStory = editions.filter((e) => e.storyId === story.id);
    const editionsByLang: Partial<Record<BookLanguage, Edition>> = {};
    for (const edition of forStory) {
      const lang = edition.language as BookLanguage;
      if (!editionsByLang[lang]) editionsByLang[lang] = edition; // najnovšia verzia je prvá (desc)
    }
    return { story, editions: editionsByLang };
  });
}

export async function getStory(storyId: string): Promise<Story | null> {
  const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId)).limit(1);
  return story ?? null;
}

export async function getLatestEdition(storyId: string, language: BookLanguage): Promise<Edition | null> {
  const [edition] = await db
    .select()
    .from(schema.storyEditions)
    .where(and(eq(schema.storyEditions.storyId, storyId), eq(schema.storyEditions.language, language)))
    .orderBy(desc(schema.storyEditions.version))
    .limit(1);
  return edition ?? null;
}

export async function createStory(input: {
  slug: string;
  category: StoryCategory;
  ageMin: number;
  ageMax: number;
  spreads: 12 | 16;
  styles: StyleId[];
  companionSlots: number;
  needsGuide: boolean;
}): Promise<Story> {
  const [story] = await db
    .insert(schema.stories)
    .values({
      slug: input.slug.trim(),
      category: input.category,
      ageMin: input.ageMin,
      ageMax: input.ageMax,
      spreads: input.spreads,
      styles: input.styles,
      companionSlots: input.companionSlots,
      needsGuide: input.needsGuide,
      published: false,
    })
    .returning();
  return story;
}

export async function setStoryPublished(storyId: string, published: boolean): Promise<void> {
  await db.update(schema.stories).set({ published }).where(eq(schema.stories.id, storyId));
}

export type EditionDraft = {
  title: string;
  annotation: string;
  developmentGoal: string;
  author: string;
  detailSlots: string[];
  spreads: { text: string; fallbackText: string; scene: string }[];
};

export type EditionCheck = { ok: boolean; issues: TemplateIssue[]; samples: TypesetSample[]; layoutFit: LayoutFitRow[] };
export type LayoutFitRow = { spread: number; maxLength: number; fits: Record<string, boolean> };

/** Kontrola šablóny (J5, J11, J13) + zmestenie do layoutov (I3, kontrola dĺžky voči layoutom). */
export function checkEdition(draft: EditionDraft, language: BookLanguage): EditionCheck {
  const template: EditionTemplate = {
    title: draft.title,
    annotation: draft.annotation,
    spreads: draft.spreads.map((s) => ({ text: s.text, fallbackText: s.fallbackText || undefined })),
  };
  const { ok, issues, samples } = validateEditionTemplate(template, language);

  const layoutFit: LayoutFitRow[] = draft.spreads.map((_, index) => {
    const lengths = samples.filter((s) => s.field === "text" && s.spread === index).map((s) => s.length);
    const maxLength = lengths.length ? Math.max(...lengths) : 0;
    const fits = Object.fromEntries(LAYOUTS.map((layout) => [layout, maxLength <= LAYOUT_SPECS[layout].maxChars.A5]));
    return { spread: index, maxLength, fits };
  });

  return { ok, issues, samples, layoutFit };
}

/** Publikovanie novej verzie edície – staršie verzie ostávajú v histórii (nemenné). */
export async function publishEdition(storyId: string, language: BookLanguage, draft: EditionDraft): Promise<Edition> {
  const check = checkEdition(draft, language);
  if (!check.ok) throw new Error("Šablóna má chyby, ktoré treba opraviť pred publikovaním.");

  const [previous] = await db
    .select({ version: schema.storyEditions.version })
    .from(schema.storyEditions)
    .where(and(eq(schema.storyEditions.storyId, storyId), eq(schema.storyEditions.language, language)))
    .orderBy(desc(schema.storyEditions.version))
    .limit(1);

  const spreads: StorySpread[] = draft.spreads.map((s) => ({
    text: s.text,
    fallbackText: s.fallbackText || undefined,
    scene: s.scene || undefined,
  }));

  const [edition] = await db
    .insert(schema.storyEditions)
    .values({
      storyId,
      language,
      version: (previous?.version ?? 0) + 1,
      title: draft.title,
      annotation: draft.annotation,
      developmentGoal: draft.developmentGoal || null,
      author: draft.author || null,
      spreads,
      detailSlots: draft.detailSlots,
    })
    .returning();
  return edition;
}

const PREVIEW_MARKET: Record<BookLanguage, MarketCode> = { sk: "sk", cs: "cz" };

/** Náhľad prvej dvojstrany rozpísaného textu (kým sa ešte len píše, nie z DB) – proces: Krok 6, ale v administrácii. */
export async function previewDraftSpread(language: BookLanguage, style: StyleId, spread: { text: string; fallbackText: string; scene: string }): Promise<SampleSpreadData> {
  const hero = testHeroes(language)[2] ?? testHeroes(language)[0];
  return getSampleSpreadData({
    market: PREVIEW_MARKET[language],
    language,
    name: hero.ctx,
    spread: { text: spread.text, fallbackText: spread.fallbackText || undefined, scene: spread.scene || undefined },
    style,
  });
}
