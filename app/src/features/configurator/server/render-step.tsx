import "server-only";

import { and, eq } from "drizzle-orm";

import { LIMITS, STYLES, defaultsForAge, type LayoutId, type StyleId } from "@/config/catalog";
import { formatMoney, type Market } from "@/config/markets";
import { db, schema } from "@/db";
import { computePrice } from "@/domain/pricing";
import type { Translator } from "@/i18n/format";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";
import type { StorySpreadPart } from "@/features/book/model/types";
import { withSignedImages } from "@/features/book/server/media";
import { getSampleSpreadData } from "@/features/book/server/sample";
import { loadBookVersion } from "@/features/book/server/versions";
import { SessionExpired, maskEmail } from "../components/SessionExpired";
import { ApproveStep } from "../components/steps/ApproveStep";
import { CharactersStep } from "../components/steps/CharactersStep";
import { ChildStep } from "../components/steps/ChildStep";
import { GeneratingStep } from "../components/steps/GeneratingStep";
import { LookStep } from "../components/steps/LookStep";
import { PhotoStep } from "../components/steps/PhotoStep";
import { PreviewStep } from "../components/steps/PreviewStep";
import { StoryStep, type StoryView } from "../components/steps/StoryStep";
import { StyleStep } from "../components/steps/StyleStep";
import { fileUrl } from "../files";
import { MASCOT_NAME, STYLE_BY_AGE, THEME_SPECS, WIZARD_MAX_IDEA_ROUNDS, type Appearance, type DetailSlot } from "../model";
import { priceSelection } from "../pricing";
import type { StepNumber } from "../steps";
import { renderDetails, renderStoryText } from "../story-text";
import { editorUsage, lookOf } from "./book";
import {
  appearanceOf,
  currentCard,
  nameContextOf,
  photosOf,
  statusAtLeast,
  stylePortraits,
  type Card,
  type ProjectBundle,
} from "./bundle";
import { regenerationsLeft } from "./hero";
import { countRecentProjects } from "./projects";
import { listLibrary, sortForAge, storyOf } from "./story";

/** Meno prvej ďalšej postavy v lokáli pre pokyn „viac o {character}“ – tvar z jazykového modulu. */
function rewriteCharacter(bundle: ProjectBundle) {
  const character = bundle.companions[0] ?? bundle.guide;
  if (!character) return null;
  const ctx = nameContextOf(character);
  return ctx.declinable ? ctx.forms.L : ctx.forms.N;
}

type Ctx = {
  bundle: ProjectBundle;
  market: Market;
  t: Translator;
  query: Record<string, string | string[] | undefined>;
};

const param = (q: Ctx["query"], key: string) => (typeof q[key] === "string" ? (q[key] as string) : undefined);

const cardUrl = (market: string, projectId: string, card: Card | null, slot = "portrait") => {
  const images = card?.images as Record<string, unknown> | null | undefined;
  return card && typeof images?.[slot] === "string" ? fileUrl(market, projectId, "karta", `${card.id}~${slot}`) : null;
};

export async function renderStep(step: StepNumber, ctx: Ctx) {
  const { bundle } = ctx;
  if (!bundle.hero) return <SessionExpired />;
  switch (step) {
    case 1:
      return childStep(ctx);
    case 2:
      return photoStep(ctx);
    case 3:
      return styleStep(ctx);
    case 4:
      return charactersStep(ctx);
    case 5:
      return storyStep(ctx);
    case 6:
      return lookStep(ctx);
    case 7:
      return generatingStep(ctx);
    case 8:
      return previewStep(ctx);
    case 9:
      return approveStep(ctx);
  }
}

function childStep({ bundle }: Ctx) {
  const hero = bundle.hero!;
  return (
    <ChildStep
      initial={{
        name: hero.name,
        gender: hero.gender,
        age: hero.age,
        bookLanguage: bundle.project.bookLanguage as BookLanguage,
        occasion: bundle.project.occasion,
        forms: nameContextOf(hero).forms,
        indeclinable: hero.nameIndeclinable,
      }}
    />
  );
}

async function photoStep({ bundle, query }: Ctx) {
  const hero = bundle.hero!;
  const [consent] = await db
    .select({ id: schema.consents.id })
    .from(schema.consents)
    .where(and(eq(schema.consents.characterId, hero.id), eq(schema.consents.type, "ai_processing"), eq(schema.consents.granted, true)))
    .limit(1);
  const mode = param(query, "opis") === "1" || hero.appearanceSource === "description" ? "description" : "photo";
  return (
    <PhotoStep
      heroId={hero.id}
      photos={photosOf(bundle, hero.id).map((p) => ({ id: p.id, verdict: p.verdict, reason: p.verdictReason }))}
      consentsGiven={!!consent}
      initialMode={mode}
      appearance={appearanceOf(hero)}
    />
  );
}

function styleStep({ bundle, market, query }: Ctx) {
  const hero = bundle.hero!;
  const id = bundle.project.id;
  const portraits = stylePortraits(bundle);
  const chosen = (bundle.project.styleId as StyleId | null) ?? null;
  const card = chosen ? currentCard(bundle, hero.id, chosen) : null;
  return (
    <StyleStep
      heroId={hero.id}
      portraits={STYLES.map((style) => {
        const row = portraits.find((p) => p.styleId === style);
        return { style, status: row?.status ?? "generating", url: cardUrl(market.code, id, row ?? null) };
      })}
      recommended={STYLE_BY_AGE(hero.age ?? 5)}
      chosenStyle={chosen}
      showGrid={param(query, "zmena") === "1"}
      card={
        card
          ? {
              status: card.status,
              portrait: cardUrl(market.code, id, card, "portrait"),
              fullBody: cardUrl(market.code, id, card, "fullBody"),
              smile: cardUrl(market.code, id, card, "smile"),
              surprise: cardUrl(market.code, id, card, "surprise"),
            }
          : null
      }
      approved={statusAtLeast(bundle.project.status, "hero_approved") && card?.status === "approved"}
      retriesLeft={regenerationsLeft(bundle, hero.id, chosen)}
      appearance={appearanceOf(hero)}
      manualRequested={!!bundle.options.heroManualRequestedAt}
      bookExists={!!bundle.book}
    />
  );
}

function charactersStep({ bundle, market, query }: Ctx) {
  const id = bundle.project.id;
  const guide = bundle.guide;
  return (
    <CharactersStep
      justApproved={param(query, "schvalene") === "1"}
      decided={!!bundle.options.charactersDecided}
      extraPrice={formatMoney(market.prices.extraCharacter, market)}
      guide={{ kind: bundle.options.guide ?? "mascot", animal: guide?.kind ?? null, name: guide?.name ?? null }}
      companions={bundle.companions.map((c) => {
        const card = bundle.cards.find((x) => x.characterId === c.id && x.version >= 1) ?? null;
        const photos = photosOf(bundle, c.id);
        return {
          id: c.id,
          kind: c.kind ?? "other",
          name: c.name,
          storyRole: c.storyRole,
          gender: (c.gender as "girl" | "boy" | null) ?? null,
          appearance: (c.appearance ?? {}) as Appearance,
          card: card ? { status: card.status, url: cardUrl(market.code, id, card), approved: card.status === "approved" } : null,
          photos: photos.map((p) => ({ id: p.id, verdict: p.verdict, reason: p.verdictReason })),
          withPhoto: c.appearanceSource === "photo",
        };
      })}
    />
  );
}

const VIEWS: Record<string, StoryView> = {
  detaily: "details",
  vlastny: "custom",
  otazky: "questions",
  namety: "ideas",
  napisat: "own",
  text: "text",
};

async function storyStep({ bundle, market, query }: Ctx) {
  const hero = bundle.hero!;
  const language = bundle.project.bookLanguage as BookLanguage;
  const ctx = nameContextOf(hero);
  const selectedId = param(query, "pribeh") ?? null;
  const view: StoryView = VIEWS[param(query, "v") ?? ""] ?? (selectedId ? "detail" : "library");
  const heroCard = currentCard(bundle, hero.id, bundle.project.styleId);
  const age = hero.age ?? 5;

  const library = sortForAge(await listLibrary(language), age);
  const tiles = library.map(({ story, edition }) => ({
    id: story.id,
    title: renderStoryText(edition.title, ctx, language),
    annotation: renderStoryText(edition.annotation, ctx, language),
    ageMin: story.ageMin,
    ageMax: story.ageMax,
    category: story.category,
    spreads: story.spreads,
    styles: story.styles,
    companionSlots: story.companionSlots,
    needsGuide: story.needsGuide,
    goal: edition.developmentGoal,
    author: edition.author,
    samples: edition.spreads.slice(0, 2).map((s) => renderStoryText(s.text, ctx, language, { fallbackText: s.fallbackText })),
    detailSlots: edition.detailSlots as DetailSlot[],
  }));

  const generated = bundle.storyInput.generated;
  const custom = bundle.project.storyPath === "C" || bundle.project.storyPath === "D";
  const customUsed = bundle.project.email && !custom ? await countRecentProjects(bundle.project.email, "custom_story") : 0;
  const names = [...bundle.companions.map((c) => c.name), ...(bundle.guide ? [bundle.guide.name] : [])];

  return (
    <StoryStep
      view={view}
      tiles={tiles}
      selectedId={selectedId}
      chosenId={bundle.project.storyPath === "A" || bundle.project.storyPath === "B" ? bundle.project.storyId : null}
      path={bundle.project.storyPath}
      storyChosen={statusAtLeast(bundle.project.status, "text_approved")}
      heroAge={age}
      heroPortrait={cardUrl(market.code, bundle.project.id, heroCard)}
      themeColor={THEME_SPECS[lookOf(bundle).theme].accent}
      companions={bundle.companions.length}
      guideNone={bundle.options.guide === "none"}
      storyInput={bundle.storyInput}
      spreads={(generated?.spreads ?? []).map((s) => ({ text: renderStoryText(s.text, ctx, language), aiFilled: !!s.aiFilled }))}
      rewritesLeft={Math.max(0, LIMITS.textAiRewrites - (bundle.storyInput.rewritesUsed ?? 0))}
      ideaRoundsLeft={Math.max(0, WIZARD_MAX_IDEA_ROUNDS - (bundle.storyInput.wizard?.ideaRounds ?? 0))}
      characterNames={names}
      rewriteCharacter={rewriteCharacter(bundle)}
      options={{
        readingLevel: bundle.options.readingLevel ?? defaultsForAge(age).readingLevel,
        spreadCount: bundle.storyInput.spreadCount ?? 12,
        bookTitle: bundle.options.bookTitle ?? "",
      }}
      prices={{ customStory: formatMoney(market.prices.customStory, market), pages40: formatMoney(market.prices.pages40, market) }}
      customLimitReached={customUsed >= LIMITS.customStoriesPer30Days}
    />
  );
}

async function lookStep({ bundle, market }: Ctx) {
  const hero = bundle.hero!;
  const language = bundle.project.bookLanguage as BookLanguage;
  const story = await storyOf(bundle);
  const first = story?.spreads[0];
  const details = bundle.storyInput.details ?? {};
  // Ukážková dvojstrana z renderera: text prvej dvojstrany s menom a detailmi.
  const sample = first
    ? await getSampleSpreadData({
        market: market.code,
        language,
        name: nameContextOf(hero),
        spread: {
          ...first,
          text: renderDetails(first.text, details),
          fallbackText: first.fallbackText ? renderDetails(first.fallbackText, details) : undefined,
        },
        style: (bundle.project.styleId ?? "watercolor") as StyleId,
      })
    : null;
  return (
    <LookStep
      look={lookOf(bundle)}
      layout={(bundle.project.layoutId ?? "classic") as LayoutId}
      format={bundle.project.format === "A4" ? "A4" : "A5"}
      pageCount={bundle.project.pageCount === 40 ? 40 : 32}
      sample={sample}
      canGenerate={bundle.project.status === "text_approved"}
      bookExists={!!bundle.book && statusAtLeast(bundle.project.status, "preview")}
      prices={{ coloring: formatMoney(market.prices.coloringBook, market), pages40: formatMoney(market.prices.pages40, market) }}
    />
  );
}

/** Dvojstrany príbehu v poradí knihy (bez titulu, aktivít a ďalších strán). */
const storySpreads = (bundle: ProjectBundle) =>
  bundle.pages
    .filter((p) => p.kind === "story_spread")
    .map((p) => ({ page: p, spread: ((p.data as StorySpreadPart | null)?.spread ?? 0) + 1 }));

function pageUrl(market: string, bundle: ProjectBundle, page: ProjectBundle["pages"][number]) {
  return page.illustrationKey && page.status === "ready" ? `${fileUrl(market, bundle.project.id, "strana", page.id)}?v=${encodeURIComponent(page.illustrationKey.slice(-12))}` : null;
}

function generatingStep({ bundle, market }: Ctx) {
  return (
    <GeneratingStep
      maskedEmail={bundle.project.email ? maskEmail(bundle.project.email) : ""}
      pages={storySpreads(bundle).map(({ page: p, spread }) => ({ id: p.id, position: spread, status: p.status, url: pageUrl(market.code, bundle, p), text: p.text }))}
    />
  );
}

async function previewStep({ bundle, market }: Ctx) {
  const usage = editorUsage(bundle);
  const book = bundle.book ? await loadBookVersion(bundle.book.id) : null;
  if (!book) return null;
  return (
    <PreviewStep
      book={withSignedImages(book, market.code)}
      rewritesLeft={Math.max(0, LIMITS.textAiRewrites - usage.rewrites)}
      imageEditsLeft={Math.max(0, LIMITS.illustrationEdits - usage.imageEdits)}
      editorial={bundle.project.storyPath === "A" || bundle.project.storyPath === "B"}
      rewriteCharacter={rewriteCharacter(bundle)}
      pages={storySpreads(bundle).map(({ page: p, spread }) => {
        const qa = (p.qa ?? {}) as { history?: unknown[]; original?: { text: string | null } };
        return {
          id: p.id,
          // Časti knihy začínajú na pozícii 1 (0 = obálka).
          partIndex: p.position - 1,
          spread,
          status: p.status,
          text: p.text,
          edited: p.editedByCustomer,
          canUndo: (qa.history?.length ?? 0) > 0,
          original: qa.original?.text ?? null,
        };
      })}
    />
  );
}

const DEDICATION_BY_OCCASION: Record<string, MessageKey> = {
  birthday: "dedication.default.birthday",
  christmas: "dedication.default.christmas",
  school: "dedication.default.school",
  kindergarten: "dedication.default.school",
};

async function approveStep({ bundle, market, t }: Ctx) {
  const hero = bundle.hero!;
  const ctx = nameContextOf(hero);
  const language = bundle.project.bookLanguage as BookLanguage;
  // Texty knihy (venovanie, zadná strana) sú v jazyku knihy, rozhranie v jazyku trhu.
  const bookT = createTranslator(language);
  const story = await storyOf(bundle);
  const look = lookOf(bundle);
  const texts = bundle.personalTexts;
  const occasionKey = DEDICATION_BY_OCCASION[bundle.project.occasion ?? ""] ?? "dedication.default.generic";

  const price = computePrice(
    priceSelection({
      storyPath: bundle.project.storyPath,
      companionCount: bundle.companions.length,
      pageCount: bundle.project.pageCount,
      format: bundle.project.format,
      coloringBook: look.coloringBook,
    }),
    market
  );
  const surcharges = price.surcharges.reduce((sum, s) => sum + s.amountMinor, 0);
  const edited = storySpreads(bundle).filter(({ page }) => page.editedByCustomer).map(({ spread }) => spread);
  const levelKey = `story.options.level.${(bundle.options.readingLevel ?? defaultsForAge(hero.age ?? 5).readingLevel).toLowerCase()}` as MessageKey;
  const characters = [
    ...bundle.companions.map((c) => c.name),
    bundle.options.guide === "animal" && bundle.guide ? bundle.guide.name : bundle.options.guide === "none" ? null : MASCOT_NAME,
  ].filter(Boolean);

  return (
    <ApproveStep
      approved={bundle.project.status === "approved_by_customer"}
      cartHref={`/${market.code}/kosik?projekt=${bundle.project.id}`}
      dedicationChosen={!!(texts.dedication || texts.from || texts.date)}
      letterEnabled={look.parentLetter}
      texts={{
        dedication: texts.dedication ?? bookT(occasionKey, { age: hero.age ?? "" }, ctx),
        from: texts.from ?? "",
        date: texts.date ?? "",
        letter: texts.letter ?? "",
        back: texts.back ?? (story ? renderStoryText(story.annotation, ctx, language) : ""),
      }}
      summary={{
        nameLine: t("approve.name", undefined, ctx),
        sample: bookT("child.check.sample1", undefined, ctx),
        characters: t("approve.characters", { list: [hero.name, ...characters].join(", ") }),
        story: t("approve.story", {
          title: story ? renderStoryText(story.title, ctx, language) : "–",
          path: t(`configurator.path.${bundle.project.storyPath ?? "A"}` as MessageKey),
          level: t(levelKey),
          extent: t("story.card.pages", { n: story?.spreads.length ?? 12 }),
        }),
        look: t("approve.look", {
          style: t(`style.${bundle.project.styleId ?? "watercolor"}` as MessageKey),
          layout: t(`layout.${bundle.project.layoutId === "panoramic" ? "panorama" : (bundle.project.layoutId ?? "classic")}` as MessageKey),
          cover: t(`book.cover.${look.cover}`),
        }),
        edited: edited.length ? t("approve.edited", { numbers: edited.join(", ") }) : null,
        price: t("approve.price", {
          base: formatMoney(price.base.amountMinor, market),
          surcharges: formatMoney(surcharges, market),
          total: formatMoney(price.totalMinor, market),
        }),
      }}
    />
  );
}
