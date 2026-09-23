/*
  Zostavenie knihy (model strán) z príbehu, hrdinu a volieb. Čistá funkcia bez DB:
  rovnaký vstup dá vždy rovnakú knihu, takže náhľad, e-kniha aj tlač sa nelíšia.

  Poradie vnútra (32 aj 40 strán):
    1            titul a venovanie (pravá strana oproti predsádke)
    2 … 2n+1     n dvojstrán príbehu (12 alebo 16)
    +4           aktivity
    +1           sprievodca pre rodiča, inak strana na kreslenie
    +1           list od rodiča, inak strana na kreslenie
    posledná     tiráž s QR (ľavá strana oproti zadnej predsádke)
*/

import {
  ACTIVITY_PICK_COUNT,
  SPREADS_FOR_PAGES,
  type ActivityId,
  type LayoutId,
  type PageCount,
} from "@/config/catalog";
import type { StorySpread } from "@/db/schema";
import { createTranslator, type MessageVars } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";
import type { BookLanguage } from "@/i18n/locales";
import { applyTypography, type NameContext } from "@/lib/language";

import { generateCount, generateFindLetters, generateMaze, uniqueNameLetters } from "../activities/generators";
import { LAYOUT_SPECS, type TextZone } from "../design";
import { createRandom } from "./random";
import { personalize, splitText } from "./text";
import type { ActivityPart, Book, BookImage, BookOptions, BookPart, StorySpreadPart } from "./types";

export const BRAND = "TAKTIK";

export type BookInput = {
  language: BookLanguage;
  /** Id projektu – semienko pre aktivity (bludisko, mriežka písmen). */
  seed: string;
  hero: { name: NameContext; age: number };
  story: {
    title: string;
    annotation: string;
    spreads: StorySpread[];
    developmentGoal?: string | null;
    /** Autor textu; null = text vznikol s pomocou AI (príbeh na mieru, vlastný príbeh). */
    author: string | null;
    /** Otázky na porozumenie (redaktor alebo AI); inak všeobecné. */
    questions?: string[];
  };
  options: BookOptions;
  personal?: {
    /** undefined = predvolené venovanie, "" = bez venovania. */
    dedication?: string;
    from?: string;
    date?: string;
    parentLetter?: string;
    backText?: string;
  };
  images: { spreads: (BookImage | null)[]; heroFullBody?: BookImage | null; heroPortrait?: BookImage | null };
  meta: { orderRef?: string; personalPageUrl: string; date: string };
  /** Zmeny pre jednotlivé dvojstrany z editora „Do detailu“ (K8.3). */
  spreadOverrides?: ({ layout?: LayoutId; textZone?: TextZone } | undefined)[];
};

export class BookBuildError extends Error {}

/** Pokojná zóna z opisu scény („Pokojná zóna vľavo hore“) – kým ju redakcia nezadáva ako pole. */
export function zoneFromScene(scene: string | undefined): TextZone {
  const text = (scene ?? "").toLowerCase();
  const match = text.match(/pokojn[áa] zóna([^.]*)/);
  const where = match?.[1] ?? "";
  const horizontal = /vpravo/.test(where) ? "right" : "left";
  const vertical = /dole/.test(where) ? "bottom" : "top";
  return `${horizontal}-${vertical}`;
}

/** Počet strán vnútra, ktoré obsadí časť. */
export const partPageCount = (part: BookPart) => (part.kind === "story_spread" ? 2 : 1);

export function buildBook(input: BookInput): Book {
  const { language, options, hero, story } = input;
  const name = hero.name;
  const t = createTranslator(language);
  const tx = (key: MessageKey, vars?: MessageVars) => applyTypography(t(key, vars, name), language);
  const text = (template: string, fallback?: string) => personalize(template, name, language, fallback);
  const rand = createRandom(input.seed);

  const expectedSpreads = SPREADS_FOR_PAGES[options.pageCount];
  if (story.spreads.length !== expectedSpreads) {
    throw new BookBuildError(
      `Príbeh má ${story.spreads.length} dvojstrán, rozsah ${options.pageCount} strán potrebuje ${expectedSpreads}.`
    );
  }
  if (options.activities.length !== ACTIVITY_PICK_COUNT || new Set(options.activities).size !== ACTIVITY_PICK_COUNT) {
    throw new BookBuildError(`Kniha potrebuje presne ${ACTIVITY_PICK_COUNT} rôzne aktivity.`);
  }

  const title = text(story.title);
  const heroName = name.forms.N;
  const locale = language === "cs" ? "cs-CZ" : "sk-SK";
  const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(input.meta.date)
  );

  const parts: BookPart[] = [];

  // Titul a venovanie
  const personal = input.personal ?? {};
  const dedication =
    personal.dedication === undefined ? tx("dedication.default.generic") : personal.dedication && text(personal.dedication);
  parts.push({
    kind: "title",
    title,
    dedication: dedication || undefined,
    from: personal.from ? text(personal.from) : undefined,
    date: personal.date ? text(personal.date) : undefined,
  });

  // Dvojstrany príbehu
  const spreadTexts: string[] = [];
  story.spreads.forEach((spread, index) => {
    const override = input.spreadOverrides?.[index];
    const layout = override?.layout ?? options.layout;
    const body = text(spread.text, spread.fallbackText);
    spreadTexts.push(body);
    const part: StorySpreadPart = {
      kind: "story_spread",
      spread: index,
      layout,
      text: body,
      textZone: override?.textZone ?? zoneFromScene(spread.scene),
      illustration: input.images.spreads[index] ?? null,
    };
    if (LAYOUT_SPECS[layout].splitText) part.textParts = splitText(body);
    parts.push(part);
  });

  // Aktivity
  for (const activity of options.activities) {
    parts.push(buildActivity(activity));
  }

  // Sprievodca pre rodiča / list od rodiča – inak voľná strana na kreslenie (rozsah sa nemení).
  const freeDraw = (): BookPart => ({ kind: "free_draw", heading: tx("book.free_draw.heading") });
  parts.push(
    options.parentGuide
      ? {
          kind: "parent_guide",
          heading: tx("book.guide.heading"),
          goal: story.developmentGoal ? text(story.developmentGoal) : undefined,
          questionsHeading: tx("book.guide.questions_heading"),
          questions: questions(),
          tipsHeading: tx("book.guide.tips_heading"),
          tips: [tx("book.guide.tip1"), tx("book.guide.tip2"), tx("book.guide.tip3")],
        }
      : freeDraw()
  );
  parts.push(
    options.parentLetter && personal.parentLetter
      ? { kind: "parent_letter", heading: tx("book.parent_letter.heading"), text: text(personal.parentLetter) }
      : freeDraw()
  );

  // Tiráž s QR (S7, S16)
  const textSentence = story.author
    ? t("ai.notice.imprint.text_editorial", { author: story.author })
    : t("ai.notice.imprint.text_ai");
  const lines = [tx("book.imprint.made_for"), tx("book.imprint.copyright", { year: input.meta.date.slice(0, 4) })];
  if (input.meta.orderRef) lines.push(tx("book.imprint.order", { ref: input.meta.orderRef }));
  parts.push({
    kind: "imprint",
    title,
    aiNotice: applyTypography(t("ai.notice.imprint", { brand: BRAND, textSentence }), language),
    lines,
    qrUrl: input.meta.personalPageUrl,
    qrLabel: tx("book.imprint.qr"),
  });

  const book: Book = {
    meta: {
      language,
      title,
      heroName,
      orderRef: input.meta.orderRef,
      personalPageUrl: input.meta.personalPageUrl,
      date: input.meta.date,
      alt: {
        illustration: t("book.alt.illustration"),
        hero: t("book.alt.hero"),
        qr: t("book.alt.qr"),
        missing: t("book.preview.illustration_missing"),
      },
    },
    options,
    cover: {
      title,
      annotation: text(story.annotation),
      hero: input.images.heroFullBody ?? null,
      portrait: input.images.heroPortrait ?? null,
      scene: input.images.spreads[0] ?? null,
    },
    back: {
      text: personal.backText ? text(personal.backText) : text(story.annotation),
      portrait: options.backPortrait ? (input.images.heroPortrait ?? null) : null,
    },
    parts,
  };

  const pages = interiorPageTotal(book);
  if (pages !== options.pageCount) {
    throw new BookBuildError(`Kniha má ${pages} strán namiesto ${options.pageCount}.`);
  }
  return book;

  function questions(): string[] {
    if (story.questions && story.questions.length > 0) return story.questions.slice(0, 3).map((q) => text(q));
    return [tx("book.questions.q1"), tx("book.questions.q2"), tx("book.questions.q3")];
  }

  function buildActivity(activity: ActivityId): ActivityPart {
    const heading = tx(`book.activity.${activity}.heading`);
    const instruction = (vars?: MessageVars) => tx(`book.activity.${activity}.instruction`, vars);
    switch (activity) {
      case "trace_name":
        return { kind: "activity", activity, heading, instruction: instruction(), data: { name: heroName } };
      case "find_letters": {
        const letters = uniqueNameLetters(heroName, language);
        return {
          kind: "activity",
          activity,
          heading,
          instruction: instruction({ letters: letters.join(" ") }),
          data: generateFindLetters(heroName, hero.age, language, rand),
        };
      }
      case "count":
        return { kind: "activity", activity, heading, instruction: instruction(), data: generateCount(hero.age, rand) };
      case "maze":
        return {
          kind: "activity",
          activity,
          heading,
          instruction: instruction(),
          data: generateMaze(hero.age, options.format, rand),
        };
      case "questions":
        return { kind: "activity", activity, heading, instruction: instruction(), data: { questions: questions() } };
      case "draw":
        return {
          kind: "activity",
          activity,
          heading,
          instruction: instruction(),
          data: { sentence: spreadTexts[spreadTexts.length - 1] ?? "" },
        };
      case "diploma":
        return {
          kind: "activity",
          activity,
          heading,
          instruction: instruction(),
          data: {
            name: heroName,
            reason: tx("book.activity.diploma.reason", { title }),
            date: dateLabel,
            signatureLabel: tx("book.activity.diploma.signature"),
          },
        };
    }
  }
}

export function interiorPageTotal(book: Pick<Book, "parts">) {
  return book.parts.reduce((sum, part) => sum + partPageCount(part), 0);
}

/** Pomocník pre testy a demo: predvolené voľby pre daný layout a rozsah. */
export function pageCountForSpreads(spreads: number): PageCount {
  return spreads > 12 ? 40 : 32;
}
