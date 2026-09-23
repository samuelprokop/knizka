/*
  Vstup knihy zo vzorového príbehu – pre testy sadzby a demo náhľad.
*/

import { SPREADS_FOR_PAGES, type BookFormat, type LayoutId, type PageCount, type StyleId } from "@/config/catalog";
import type { BookLanguage } from "@/i18n/locales";
import { guessNameForms, type Gender, type NameContext } from "@/lib/language";

import type { BookInput } from "../model/build";
import { defaultBookOptions } from "../model/options";
import type { BookImage } from "../model/types";
import { SAMPLE_STORY, sampleSpreads } from "./sample-story";

/** Najkratšie a najdlhšie povolené meno (2 a 12 znakov) – pravidlo pre redaktorov aj test sadzby. */
export const TEST_NAMES: { name: string; gender: Gender }[] = [
  { name: "Al", gender: "boy" },
  { name: "Konštantínko", gender: "boy" },
  { name: "Maximiliánka", gender: "girl" },
];

export function guessedNameContext(name: string, gender: Gender, language: BookLanguage): NameContext {
  const guess = guessNameForms(name, gender, language);
  return { forms: guess.forms, gender, declinable: guess.declinable };
}

export function sampleBookInput(params: {
  language?: BookLanguage;
  name?: NameContext;
  age?: number;
  style?: StyleId;
  pageCount?: PageCount;
  layout?: LayoutId;
  format?: BookFormat;
  images?: { spreads?: (BookImage | null)[]; heroFullBody?: BookImage | null; heroPortrait?: BookImage | null };
}): BookInput {
  const language = params.language ?? "sk";
  const pageCount = params.pageCount ?? 32;
  const age = params.age ?? 5;
  const spreads = sampleSpreads(language, SPREADS_FOR_PAGES[pageCount]);
  return {
    language,
    seed: "vzorovy-projekt",
    hero: { name: params.name ?? guessedNameContext("Ema", "girl", language), age },
    story: { ...SAMPLE_STORY[language], spreads },
    options: defaultBookOptions({
      age,
      style: params.style ?? "watercolor",
      format: params.format,
      pageCount,
      layout: params.layout,
    }),
    images: {
      spreads: params.images?.spreads ?? spreads.map((_, i) => ({ key: `mock/spread-${i}.svg` })),
      heroFullBody: params.images?.heroFullBody ?? null,
      heroPortrait: params.images?.heroPortrait ?? null,
    },
    meta: { personalPageUrl: "https://kniha.taktik.sk/k/ukazka", date: "2026-09-23" },
  };
}
