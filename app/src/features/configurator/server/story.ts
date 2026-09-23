import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { LIMITS, SPREADS_FOR_PAGES, type PageCount, type ReadingLevel } from "@/config/catalog";
import { db, schema } from "@/db";
import type { StorySpread } from "@/db/schema";
import type { BookLanguage } from "@/i18n/locales";
import { getTextProvider, type StoryBrief, type StoryIdea } from "@/server/ai";
import { withAiJob } from "./ai-jobs";
import { loadBundle, nameContextOf, type ProjectBundle } from "./bundle";
import { countRecentProjects, ValidationError } from "./projects";
import { advanceStatus, changeRegeneratesBook, rewindStatus } from "../status";
import {
  DETAIL_MAX_CHARS,
  DETAIL_SLOTS,
  WIZARD_MAX_IDEA_ROUNDS,
  type DetailSlot,
  type GeneratedSpread,
  type ProjectOptions,
  type StoryInput,
  type WizardAnswers,
} from "../model";
import { tokenizeName } from "../story-text";
import { cleanText } from "../validation";

export type Story = typeof schema.stories.$inferSelect;
export type Edition = typeof schema.storyEditions.$inferSelect;
export type LibraryItem = { story: Story; edition: Edition };

/** Knižnica hotových príbehov v jazyku knihy – najnovšia verzia edície (K5.1). */
export async function listLibrary(language: BookLanguage): Promise<LibraryItem[]> {
  const rows = await db
    .select({ story: schema.stories, edition: schema.storyEditions })
    .from(schema.stories)
    .innerJoin(schema.storyEditions, eq(schema.storyEditions.storyId, schema.stories.id))
    .where(and(eq(schema.stories.published, true), eq(schema.storyEditions.language, language)))
    .orderBy(desc(schema.storyEditions.version));
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.story.id) ? false : (seen.add(r.story.id), true)));
}

export async function getLibraryItem(storyId: string, language: BookLanguage): Promise<LibraryItem | null> {
  const items = await listLibrary(language);
  return items.find((i) => i.story.id === storyId) ?? null;
}

/** Odporúčané poradie: najprv príbehy pre vek, potom ostatné (K5.1). */
export function sortForAge(items: LibraryItem[], age: number) {
  const fits = (i: LibraryItem) => (age >= i.story.ageMin && age <= i.story.ageMax ? 0 : 1);
  return [...items].sort((a, b) => fits(a) - fits(b));
}

// ---------------------------------------------------------------- zápis

async function saveStory(
  bundle: ProjectBundle,
  patch: Partial<Pick<typeof schema.projects.$inferInsert, "storyPath" | "storyId" | "pageCount">> & {
    storyInput?: StoryInput;
    options?: ProjectOptions;
  },
  target: "chosen" | "pending"
) {
  let status = bundle.project.status;
  // Zmena príbehu po vygenerovaní – nové generovanie, Karta hrdinu zostáva.
  if (changeRegeneratesBook(status)) status = rewindStatus(status, "text_approved");
  if (target === "pending" && status === "text_approved") status = rewindStatus(status, "hero_approved");
  if (target === "chosen" && status === "hero_approved") status = advanceStatus(status, "text_approved");

  await db
    .update(schema.projects)
    .set({ ...patch, status, lastActivityAt: new Date() })
    .where(eq(schema.projects.id, bundle.project.id));
}

async function requireBundle(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) throw new Error("Projekt neexistuje");
  return bundle;
}

/** Cesta A (hotový príbeh) alebo B (s vlastnými detailmi). */
export async function chooseLibraryStory(projectId: string, storyId: string, details?: Partial<Record<DetailSlot, string>>) {
  const bundle = await requireBundle(projectId);
  const item = await getLibraryItem(storyId, bundle.project.bookLanguage as BookLanguage);
  if (!item) throw new ValidationError("story.refuse.retry");

  const clean: Partial<Record<DetailSlot, string>> = {};
  for (const slot of DETAIL_SLOTS) {
    if (!item.edition.detailSlots.includes(slot)) continue;
    const value = cleanText(details?.[slot], DETAIL_MAX_CHARS);
    if (value) clean[slot] = value;
  }
  const hasDetails = Object.keys(clean).length > 0;
  await saveStory(
    bundle,
    {
      storyPath: hasDetails ? "B" : "A",
      storyId: item.story.id,
      pageCount: item.story.spreads === 16 ? 40 : 32,
      // Rozpracovaný príbeh na mieru ostáva uložený – zákazník sa k nemu môže vrátiť.
      storyInput: { ...bundle.storyInput, details: clean },
    },
    "chosen"
  );
}

// ---------------------------------------------------------------- cesty C a D

function briefFor(bundle: ProjectBundle, answers: Record<string, unknown>, spreads: 12 | 16): StoryBrief {
  // Do textového modelu ide len krstné meno, vek, rod a odpovede – nič viac (S13).
  return {
    language: bundle.project.bookLanguage as BookLanguage,
    heroFirstName: bundle.hero!.name,
    age: bundle.hero!.age ?? 5,
    gender: bundle.hero!.gender ?? "girl",
    answers,
    spreads,
  };
}

async function assertCustomStoryAllowed(bundle: ProjectBundle) {
  if (bundle.project.storyPath === "C" || bundle.project.storyPath === "D") return;
  if (!bundle.project.email) return;
  const used = await countRecentProjects(bundle.project.email, "custom_story");
  if (used >= LIMITS.customStoriesPer30Days) throw new ValidationError("story.limit.custom");
}

/** JSON so zoradenými kľúčmi – jsonb v PostgreSQL poradie kľúčov nezachováva. */
const stableJson = (value: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== "").sort(([a], [b]) => a.localeCompare(b))));

const spreadCountOf = (input: StoryInput): 12 | 16 => input.spreadCount ?? 12;

/** Cesta C: odpovede → 3 námety do 20 s; „Iné námety“ najviac 2× (K5.6). */
export async function requestIdeas(projectId: string, answers: WizardAnswers) {
  const bundle = await requireBundle(projectId);
  await assertCustomStoryAllowed(bundle);
  const safe = { ...answers, wish: cleanText(answers.wish, LIMITS.wishMaxChars), favorites: cleanText(answers.favorites, 200) };
  // Porovnávajú sa očistené odpovede – rovnaké ako uložené, inak by sa limit kôl dal obísť.
  const previous = bundle.storyInput.wizard;
  const sameAnswers = !!previous && stableJson(previous.answers) === stableJson(safe);
  const rounds = sameAnswers ? (previous?.ideaRounds ?? 0) : 0;
  if (rounds >= WIZARD_MAX_IDEA_ROUNDS) throw new ValidationError("wizard.ideas.more.counter");

  const { ideas } = await withAiJob(
    { projectId, kind: "story_ideas", params: { tone: safe.tone, worlds: safe.worlds, message: safe.message } },
    () => getTextProvider().storyIdeas(briefFor(bundle, safe, spreadCountOf(bundle.storyInput)))
  );
  await saveStory(
    bundle,
    { storyPath: "C", storyId: null, storyInput: { ...bundle.storyInput, wizard: { answers: safe, ideas, ideaRounds: rounds + 1 }, textApprovedAt: undefined } },
    "pending"
  );
  return ideas;
}

function toSpreads(spreads: { text: string; scene: string }[], limit: number): GeneratedSpread[] {
  return spreads.map((s) => ({ text: s.text.slice(0, limit), scene: s.scene }));
}

/** Cesta C: vybraný námet → celý text po dvojstranách do 60 s. */
export async function writeFromIdea(projectId: string, ideaIndex: number) {
  const bundle = await requireBundle(projectId);
  const idea: StoryIdea | undefined = bundle.storyInput.wizard?.ideas?.[ideaIndex];
  if (!idea) throw new ValidationError("story.refuse.retry");
  const spreads = spreadCountOf(bundle.storyInput);
  const { story } = await withAiJob(
    { projectId, kind: "story_write", params: { path: "C", spreads } },
    () => getTextProvider().writeStory(briefFor(bundle, bundle.storyInput.wizard!.answers, spreads), idea)
  );
  await saveStory(
    bundle,
    {
      storyInput: {
        ...bundle.storyInput,
        generated: { title: story.title, annotation: story.annotation, spreads: toSpreads(story.spreads, SPREAD_TEXT_MAX) },
        rewritesUsed: 0,
        textApprovedAt: undefined,
      },
      pageCount: spreads === 16 ? 40 : 32,
    },
    "pending"
  );
}

/** Najviac znakov na dvojstranu pri úprave textu (limit layoutu dolaďuje balík C). */
export const SPREAD_TEXT_MAX = 400;

/** Cesta D: vlastný text do 1 500 znakov → AI ho rozpíše do dvojstrán (K5.7). */
export async function writeOwnStory(projectId: string, text: string, mode: "strict" | "free") {
  const bundle = await requireBundle(projectId);
  await assertCustomStoryAllowed(bundle);
  const ownText = cleanText(text, LIMITS.ownStoryMaxChars);
  if (ownText.length < 20) throw new ValidationError("own.placeholder");
  const spreads = spreadCountOf(bundle.storyInput);
  const { story } = await withAiJob(
    { projectId, kind: "story_write", params: { path: "D", mode, spreads } },
    () => getTextProvider().writeStory(briefFor(bundle, { mode }, spreads), { ownText })
  );
  await saveStory(
    bundle,
    {
      storyPath: "D",
      storyId: null,
      pageCount: spreads === 16 ? 40 : 32,
      storyInput: {
        ...bundle.storyInput,
        own: { text: ownText, mode },
        generated: {
          title: story.title,
          annotation: story.annotation,
          // Pri „môžeš doplniť dej“ sú domyslené časti jemne označené (proces D2).
          spreads: toSpreads(story.spreads, SPREAD_TEXT_MAX).map((s, i) => ({ ...s, aiFilled: mode === "free" && i % 3 === 2 })),
        },
        rewritesUsed: 0,
        textApprovedAt: undefined,
      },
    },
    "pending"
  );
}

/** Vlastná úprava textu dvojstrany v limite znakov (bez limitu počtu). */
export async function editSpread(projectId: string, index: number, text: string) {
  const bundle = await requireBundle(projectId);
  const generated = bundle.storyInput.generated;
  if (!generated?.spreads[index]) throw new Error("Dvojstrana neexistuje");
  const clean = cleanText(text, SPREAD_TEXT_MAX);
  if (!clean) throw new ValidationError("text.limit");
  // Meno v tvaroch sa vráti na značky – text ostane napojený na jazykový modul.
  const tokenized = tokenizeName(clean, nameContextOf(bundle.hero!).forms);
  const spreads = generated.spreads.map((s, i) => (i === index ? { ...s, text: tokenized, aiFilled: false } : s));
  await saveStory(bundle, { storyInput: { ...bundle.storyInput, generated: { ...generated, spreads }, textApprovedAt: undefined } }, "pending");
}

/** „Nech to AI prepíše“ s pokynom – najviac 5× v cene (K5.8). */
export async function rewriteSpread(projectId: string, index: number, instruction: string) {
  const bundle = await requireBundle(projectId);
  const generated = bundle.storyInput.generated;
  if (!generated?.spreads[index]) throw new Error("Dvojstrana neexistuje");
  const used = bundle.storyInput.rewritesUsed ?? 0;
  if (used >= LIMITS.textAiRewrites) throw new ValidationError("text.rewrite.counter");
  const clean = cleanText(instruction, 200);
  const { text } = await withAiJob(
    { projectId, kind: "spread_rewrite", params: { index }, prompt: clean },
    () => getTextProvider().rewriteSpread(generated.spreads[index].text, clean, bundle.project.bookLanguage as BookLanguage)
  );
  const spreads = generated.spreads.map((s, i) => (i === index ? { ...s, text: text.slice(0, SPREAD_TEXT_MAX), aiFilled: false } : s));
  await saveStory(
    bundle,
    { storyInput: { ...bundle.storyInput, generated: { ...generated, spreads }, rewritesUsed: used + 1, textApprovedAt: undefined } },
    "pending"
  );
}

/** „Text sa mi páči, poďme na obrázky“ – schválenie sa zaznamená (K5.12). */
export async function approveText(projectId: string) {
  const bundle = await requireBundle(projectId);
  if (!bundle.storyInput.generated) throw new Error("Chýba text");
  await saveStory(bundle, { storyInput: { ...bundle.storyInput, textApprovedAt: new Date().toISOString() } }, "chosen");
}

/** Voľby k príbehu: úroveň, dĺžka, vlastný názov (K5.11). */
export async function saveStoryOptions(
  projectId: string,
  input: { readingLevel?: ReadingLevel; spreadCount?: 12 | 16; bookTitle?: string }
) {
  const bundle = await requireBundle(projectId);
  const spreadCount = input.spreadCount ?? spreadCountOf(bundle.storyInput);
  const lengthChanged = spreadCount !== spreadCountOf(bundle.storyInput);
  const custom = bundle.project.storyPath === "C" || bundle.project.storyPath === "D";
  await db
    .update(schema.projects)
    .set({
      options: {
        ...bundle.options,
        readingLevel: input.readingLevel ?? bundle.options.readingLevel,
        bookTitle: input.bookTitle !== undefined ? cleanText(input.bookTitle, 60) || undefined : bundle.options.bookTitle,
      },
      storyInput: { ...bundle.storyInput, spreadCount },
      // Pri 16 dvojstranách sa rozsah prepne na 40 strán (krok 6).
      ...(custom ? { pageCount: spreadCount === 16 ? 40 : 32 } : {}),
    })
    .where(eq(schema.projects.id, projectId));
  return { lengthChanged };
}

// ---------------------------------------------------------------- text knihy

export type BookStory = {
  title: string;
  annotation: string;
  spreads: (StorySpread & { aiFilled?: boolean })[];
  author: string | null;
  developmentGoal: string | null;
};

/** Text príbehu projektu (so značkami mena) – z edície (A/B) alebo vygenerovaný (C/D). */
export async function storyOf(bundle: ProjectBundle): Promise<BookStory | null> {
  const path = bundle.project.storyPath;
  if ((path === "A" || path === "B") && bundle.project.storyId) {
    const item = await getLibraryItem(bundle.project.storyId, bundle.project.bookLanguage as BookLanguage);
    if (!item) return null;
    return {
      title: bundle.options.bookTitle ?? item.edition.title,
      annotation: item.edition.annotation,
      spreads: item.edition.spreads,
      author: item.edition.author,
      developmentGoal: item.edition.developmentGoal,
    };
  }
  const generated = bundle.storyInput.generated;
  if ((path === "C" || path === "D") && generated) {
    return {
      title: bundle.options.bookTitle ?? generated.title,
      annotation: generated.annotation,
      spreads: generated.spreads,
      author: null,
      developmentGoal: null,
    };
  }
  return null;
}

export const spreadsForPages = (pageCount: number) => SPREADS_FOR_PAGES[(pageCount === 40 ? 40 : 32) as PageCount];
