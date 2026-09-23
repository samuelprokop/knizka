import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  ACTIVITIES,
  ACTIVITY_PICK_COUNT,
  BOOK_FORMATS,
  COVER_DESIGNS,
  LAYOUTS,
  LAYOUT_IMAGE_RATIO,
  LIMITS,
  PAGE_COUNTS,
  defaultsForAge,
  type ActivityId,
  type LayoutId,
  type StyleId,
} from "@/config/catalog";
import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import { getImageProvider, getTextProvider } from "@/server/ai";
import { withAiJob } from "./ai-jobs";
import { currentCard, loadBundle, nameContextOf, type BookPage, type ProjectBundle } from "./bundle";
import { countRecentProjects, ValidationError } from "./projects";
import { storyOf } from "./story";
import { advanceStatus } from "../status";
import {
  ENDPAPERS,
  FONT_PAIRS,
  THEMES,
  TITLE_POSITIONS,
  defaultLook,
  type LookOptions,
  type PersonalTexts,
  type ProjectOptions,
} from "../model";
import { renderStoryText } from "../story-text";
import { cleanText } from "../validation";

// ---------------------------------------------------------------- krok 6

export function lookOf(bundle: ProjectBundle): LookOptions {
  const age = bundle.hero?.age ?? 5;
  return { ...defaultLook(defaultsForAge(age).activities), ...bundle.options.look };
}

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

export type LookInput = Partial<LookOptions> & { layout?: LayoutId; format?: string; pageCount?: number };

/**
 * Uloží voľby vzhľadu. Obálka, téma, písmo, predsádky a aktivity sa menia
 * zadarmo aj po vygenerovaní; zmena pomeru obrázka (panoramatický layout)
 * po vygenerovaní znamená nové ilustrácie (K6.4).
 */
export async function saveLook(projectId: string, input: LookInput) {
  const bundle = await loadBundle(projectId);
  if (!bundle) throw new Error("Projekt neexistuje");
  const current = lookOf(bundle);

  const activities = Array.isArray(input.activities)
    ? [...new Set(input.activities.filter((a): a is ActivityId => ACTIVITIES.includes(a)))]
    : current.activities;
  if (activities.length > ACTIVITY_PICK_COUNT) throw new ValidationError("activities.help");

  const look: LookOptions = {
    cover: oneOf(COVER_DESIGNS, input.cover, current.cover),
    theme: oneOf(THEMES, input.theme, current.theme),
    font: oneOf(FONT_PAIRS, input.font, current.font),
    titlePosition: oneOf(TITLE_POSITIONS, input.titlePosition, current.titlePosition),
    endpapers: oneOf(ENDPAPERS, input.endpapers, current.endpapers),
    frames: input.frames ?? current.frames,
    backPortrait: input.backPortrait ?? current.backPortrait,
    activities,
    parentGuide: input.parentGuide ?? current.parentGuide,
    parentLetter: input.parentLetter ?? current.parentLetter,
    coloringBook: input.coloringBook ?? current.coloringBook,
  };

  const layout = oneOf(LAYOUTS, input.layout, (bundle.project.layoutId ?? "classic") as LayoutId);
  const format = oneOf(BOOK_FORMATS, input.format, bundle.project.format === "A4" ? "A4" : "A5");
  // Pri 16 dvojstranách príbehu je rozsah vždy 40 strán.
  const minPages = (bundle.storyInput.spreadCount ?? 12) === 16 ? 40 : 32;
  const requestedPages = PAGE_COUNTS.includes(input.pageCount as 32 | 40) ? (input.pageCount as 32 | 40) : bundle.project.pageCount;
  const pageCount = Math.max(requestedPages, minPages);

  const oldLayout = (bundle.project.layoutId ?? "classic") as LayoutId;
  const ratioChanged = LAYOUT_IMAGE_RATIO[oldLayout] !== LAYOUT_IMAGE_RATIO[layout];

  await db
    .update(schema.projects)
    .set({ options: { ...bundle.options, look } satisfies ProjectOptions, layoutId: layout, format, pageCount, lastActivityAt: new Date() })
    .where(eq(schema.projects.id, projectId));

  if (ratioChanged && bundle.book && bundle.project.status === "preview") {
    // Nové ilustrácie všetkých dvojstrán v novom pomere – kniha ide znova do generovania.
    await db
      .update(schema.bookPages)
      .set({ status: "pending", layoutId: layout })
      .where(and(eq(schema.bookPages.bookVersionId, bundle.book.id), eq(schema.bookPages.kind, "story_spread")));
    await db
      .update(schema.projects)
      .set({ status: advanceStatus("preview", "generating") })
      .where(eq(schema.projects.id, projectId));
    return { regenerate: true };
  }
  return { regenerate: false };
}

// ---------------------------------------------------------------- krok 7

/** Po „Vygenerovať knihu“ sa voľby uzamknú do novej verzie knihy (proces: Krok 6). */
export async function startGeneration(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero || !bundle.project.styleId) throw new Error("Projekt nie je pripravený");
  if (bundle.project.status !== "text_approved") throw new ValidationError("error.generic");

  if (bundle.project.email) {
    const previews = await countRecentProjects(bundle.project.email, "preview");
    const own = bundle.book ? 1 : 0;
    if (previews - own >= LIMITS.freePreviewsPer30Days) throw new ValidationError("limit.previews");
  }

  const story = await storyOf(bundle);
  if (!story) throw new ValidationError("story.refuse.retry");
  const ctx = nameContextOf(bundle.hero);
  const language = bundle.project.bookLanguage as BookLanguage;
  const title = renderStoryText(story.title, ctx, language);
  const layout = (bundle.project.layoutId ?? "classic") as LayoutId;
  const version = (bundle.book?.version ?? 0) + 1;

  await db.transaction(async (tx) => {
    const [book] = await tx
      .insert(schema.bookVersions)
      .values({
        projectId,
        version,
        snapshot: {
          styleId: bundle.project.styleId,
          layoutId: layout,
          format: bundle.project.format,
          pageCount: bundle.project.pageCount,
          storyPath: bundle.project.storyPath,
          storyId: bundle.project.storyId,
          look: lookOf(bundle),
          readingLevel: bundle.options.readingLevel,
          title,
        },
      })
      .returning();

    // Zjednodušený zoznam strán (obálka + dvojstrany príbehu). Úplný model knihy
    // (predsádky, venovanie, aktivity, tiráž…) dodá balík C.
    const pages = [
      { bookVersionId: book.id, position: 0, kind: "cover", text: title, layoutId: layout },
      ...story.spreads.map((spread, i) => ({
        bookVersionId: book.id,
        position: i + 1,
        kind: "story_spread",
        text: renderStoryText(spread.text, ctx, language, { fallbackText: spread.fallbackText, details: bundle.storyInput.details }),
        layoutId: layout,
        qa: { scene: spread.scene ?? "" },
      })),
    ];
    await tx.insert(schema.bookPages).values(pages);
    await tx
      .update(schema.projects)
      .set({ status: advanceStatus("text_approved", "generating"), currentStep: 7 })
      .where(eq(schema.projects.id, projectId));
  });
}

const mockDelay = () =>
  getImageProvider().id === "mock"
    ? new Promise((resolve) => setTimeout(resolve, Number(process.env.MOCK_AI_DELAY_MS ?? 700)))
    : Promise.resolve();

async function renderPage(bundle: ProjectBundle, page: BookPage, extra?: string) {
  const style = bundle.project.styleId as StyleId;
  const cardKeys = [bundle.hero, ...bundle.companions]
    .map((c) => (c ? currentCard(bundle, c.id, style)?.images?.portrait : null))
    .filter((k): k is string => typeof k === "string");
  const layout = (page.layoutId ?? bundle.project.layoutId ?? "classic") as LayoutId;
  const scene = String((page.qa as { scene?: string } | null)?.scene ?? "");
  const { image } = await withAiJob(
    { projectId: bundle.project.id, kind: page.kind === "cover" ? "cover" : "scene", params: { style, layout, position: page.position, edit: extra } },
    () =>
      getImageProvider().scene({
        style,
        scene: extra ? `${scene} ${extra}` : scene,
        characterCardKeys: cardKeys,
        aspect: page.kind === "cover" ? "1:1" : LAYOUT_IMAGE_RATIO[layout],
      })
  );
  return image.storageKey;
}

/**
 * Generovanie po dvojstranách na pozadí (mock). Hotová strana sa ukáže až po
 * automatickej kontrole (K7.2) – kontrolu zatiaľ zastupuje „ok“; balík B dodá
 * frontu, kontrolu a 2 automatické opakovania.
 */
export async function runGeneration(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.book || bundle.project.status !== "generating") return;

  for (const page of bundle.pages) {
    if (page.status === "ready") continue;
    await db
      .update(schema.bookPages)
      .set({ status: "generating", attempts: sql`${schema.bookPages.attempts} + 1` })
      .where(eq(schema.bookPages.id, page.id));
    try {
      await mockDelay();
      const key = await renderPage(bundle, page);
      await db.update(schema.bookPages).set({ status: "ready", illustrationKey: key }).where(eq(schema.bookPages.id, page.id));
    } catch {
      // Po opakovaniach strana čaká na grafika; kniha sa dá dokončiť (proces: Krok 8).
      await db.update(schema.bookPages).set({ status: "needs_review" }).where(eq(schema.bookPages.id, page.id));
    }
  }

  const [project] = await db.select({ status: schema.projects.status }).from(schema.projects).where(eq(schema.projects.id, projectId));
  if (project?.status === "generating") {
    await db.update(schema.projects).set({ status: advanceStatus("generating", "preview"), currentStep: 8 }).where(eq(schema.projects.id, projectId));
  }
}

// ---------------------------------------------------------------- krok 8: editor strany

type PageHistoryEntry = { text: string | null; illustrationKey: string | null; at: string };
type PageQa = { scene?: string; history?: PageHistoryEntry[]; original?: PageHistoryEntry; reports?: string[]; imageEdits?: number };

const qaOf = (page: BookPage): PageQa => (page.qa ?? {}) as PageQa;

export type EditorUsage = { rewrites: number; imageEdits: number };
export const editorUsage = (bundle: ProjectBundle): EditorUsage => bundle.options.editor ?? { rewrites: 0, imageEdits: 0 };

async function loadPage(projectId: string, pageId: string) {
  const bundle = await loadBundle(projectId);
  const page = bundle?.pages.find((p) => p.id === pageId);
  if (!bundle || !page) throw new Error("Strana nepatrí k projektu");
  if (bundle.project.status !== "preview") throw new ValidationError("editor.preparing");
  return { bundle, page };
}

function withHistory(page: BookPage): PageQa {
  const qa = qaOf(page);
  const entry: PageHistoryEntry = { text: page.text, illustrationKey: page.illustrationKey, at: new Date().toISOString() };
  // Verzie strany sa uchovávajú do schválenia knihy (proces: Editor, História).
  return { ...qa, original: qa.original ?? entry, history: [...(qa.history ?? []), entry].slice(-20) };
}

async function saveUsage(bundle: ProjectBundle, usage: EditorUsage) {
  await db
    .update(schema.projects)
    .set({ options: { ...bundle.options, editor: usage } satisfies ProjectOptions })
    .where(eq(schema.projects.id, bundle.project.id));
}

export const PAGE_TEXT_MAX = 400;

/** Vlastná úprava textu strany – bez limitu počtu, stranu prečíta redaktor (K8.2, K8.5). */
export async function editPageText(projectId: string, pageId: string, text: string) {
  const { page } = await loadPage(projectId, pageId);
  const clean = cleanText(text, PAGE_TEXT_MAX);
  if (!clean) throw new ValidationError("editor.text_rejected");
  await db
    .update(schema.bookPages)
    .set({ text: clean, editedByCustomer: true, qa: withHistory(page) })
    .where(eq(schema.bookPages.id, page.id));
}

export async function rewritePageText(projectId: string, pageId: string, instruction: string) {
  const { bundle, page } = await loadPage(projectId, pageId);
  const usage = editorUsage(bundle);
  if (usage.rewrites >= LIMITS.textAiRewrites) throw new ValidationError("editor.limits_exhausted");
  const clean = cleanText(instruction, 200);
  const { text } = await withAiJob(
    { projectId, kind: "page_rewrite", params: { position: page.position }, prompt: clean },
    () => getTextProvider().rewriteSpread(page.text ?? "", clean, bundle.project.bookLanguage as BookLanguage)
  );
  await db
    .update(schema.bookPages)
    .set({ text: text.slice(0, PAGE_TEXT_MAX), editedByCustomer: true, qa: withHistory(page) })
    .where(eq(schema.bookPages.id, page.id));
  await saveUsage(bundle, { ...usage, rewrites: usage.rewrites + 1 });
}

/** Úprava ilustrácie s pokynom z ponuky alebo vlastným do 200 znakov – 5 v cene (K8.2, K8.4). */
export async function editPageImage(projectId: string, pageId: string, instruction: string) {
  const { bundle, page } = await loadPage(projectId, pageId);
  const usage = editorUsage(bundle);
  if (usage.imageEdits >= LIMITS.illustrationEdits) throw new ValidationError("editor.limits_exhausted");
  const clean = cleanText(instruction, 200);
  if (!clean) throw new ValidationError("editor.image.custom");
  await db
    .update(schema.bookPages)
    .set({ status: "generating", editedByCustomer: true, qa: withHistory(page) })
    .where(eq(schema.bookPages.id, page.id));
  await saveUsage(bundle, { ...usage, imageEdits: usage.imageEdits + 1 });
  return { bundle, page, instruction: clean };
}

/** Beží na pozadí po editPageImage – strana má medzitým „Pripravujeme stranu…“. */
export async function finishPageImage(bundle: ProjectBundle, page: BookPage, instruction: string) {
  try {
    await mockDelay();
    const key = await renderPage(bundle, page, instruction);
    await db.update(schema.bookPages).set({ status: "ready", illustrationKey: key }).where(eq(schema.bookPages.id, page.id));
  } catch {
    await db.update(schema.bookPages).set({ status: "needs_review" }).where(eq(schema.bookPages.id, page.id));
  }
}

/** „Vrátiť späť“ – obnoví predchádzajúcu verziu strany. */
export async function undoPage(projectId: string, pageId: string) {
  const { page } = await loadPage(projectId, pageId);
  const qa = qaOf(page);
  const previous = qa.history?.at(-1);
  if (!previous) return;
  const history = qa.history!.slice(0, -1);
  const backToOriginal = history.length === 0;
  await db
    .update(schema.bookPages)
    .set({
      text: previous.text,
      illustrationKey: previous.illustrationKey,
      editedByCustomer: !backToOriginal,
      qa: { ...qa, history },
    })
    .where(eq(schema.bookPages.id, page.id));
}

/** „Niečo nesedí“ – strana ide na kontrolu človekom. */
export async function reportPage(projectId: string, pageId: string, reason: string) {
  const { page } = await loadPage(projectId, pageId);
  const qa = qaOf(page);
  await db
    .update(schema.bookPages)
    .set({ qa: { ...qa, reports: [...(qa.reports ?? []), cleanText(reason, 40)] } })
    .where(eq(schema.bookPages.id, page.id));
}

// ---------------------------------------------------------------- krok 9

export async function savePersonalTexts(projectId: string, input: PersonalTexts) {
  const clean: PersonalTexts = {
    dedication: cleanText(input.dedication, LIMITS.dedicationMaxChars),
    from: cleanText(input.from, 80),
    date: cleanText(input.date, 60),
    letter: cleanText(input.letter, LIMITS.parentLetterMaxChars),
    back: cleanText(input.back, LIMITS.backCoverMaxChars),
  };
  await db.update(schema.projects).set({ personalTexts: clean, lastActivityAt: new Date() }).where(eq(schema.projects.id, projectId));
}

/** „Schváliť a objednať“ – uzamkne verziu knihy a odovzdá ju do košíka (K9.1). */
export async function approveBook(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.book) throw new Error("Kniha ešte nie je vytvorená");
  if (bundle.project.status === "approved_by_customer") return;
  if (bundle.pages.some((p) => p.status === "generating" || p.status === "pending")) throw new ValidationError("editor.preparing");

  await db.transaction(async (tx) => {
    await tx.update(schema.bookVersions).set({ lockedAt: new Date() }).where(eq(schema.bookVersions.id, bundle.book!.id));
    await tx
      .update(schema.projects)
      .set({ status: advanceStatus(bundle.project.status, "approved_by_customer"), currentStep: 9 })
      .where(eq(schema.projects.id, projectId));
  });
}
