import "server-only";

import { z } from "zod";

import { BOOK_FORMATS, COVER_DESIGNS, LAYOUT_IMAGE_RATIO, LAYOUTS, PAGE_COUNTS, STYLES } from "@/config/catalog";
import type { MarketCode } from "@/config/markets";
import { getMarket } from "@/config/markets";
import { BOOK_LANGUAGES } from "@/i18n/locales";
import type { NameContext } from "@/lib/language";
import { resolveName } from "@/lib/language/resolve";

import { DEFAULT_FONT_FOR_LAYOUT, DEFAULT_THEME_FOR_STYLE, DEFAULT_TITLE_POSITION, ENDPAPERS, FONT_PAIRS, THEMES, TITLE_POSITIONS } from "../design";
import { sampleBookInput } from "../fixtures/sample-book";
import { buildBook } from "../model/build";
import type { Book } from "../model/types";
import { getDemoIllustrations } from "./illustrations";
import { loadBookVersion } from "./versions";

/*
  Demo kniha pre vývojový náhľad /[market]/nahlad – vzorový príbeh s menom
  a voľbami z URL, alebo uložená verzia (?verzia=<id>). Nie je to zákaznícka cesta.
*/

export const demoParamsSchema = z.object({
  meno: z.string().trim().min(2).max(12).catch("Ema"),
  rod: z.enum(["girl", "boy"]).catch("girl"),
  vek: z.coerce.number().int().min(3).max(8).catch(5),
  jazyk: z.enum(BOOK_LANGUAGES).optional().catch(undefined),
  layout: z.enum(LAYOUTS).optional().catch(undefined),
  format: z.enum(BOOK_FORMATS).catch("A5"),
  strany: z.coerce.number().pipe(z.union([z.literal(PAGE_COUNTS[0]), z.literal(PAGE_COUNTS[1])])).catch(32),
  styl: z.enum(STYLES).catch("watercolor"),
  tema: z.enum(THEMES).optional().catch(undefined),
  pismo: z.enum(FONT_PAIRS).optional().catch(undefined),
  obalka: z.enum(COVER_DESIGNS).catch("hero_in_scene"),
  nazov: z.enum(TITLE_POSITIONS).optional().catch(undefined),
  predsadka: z.enum(ENDPAPERS).catch("dots"),
  ramiky: z.enum(["1"]).optional().catch(undefined),
  verzia: z.uuid().optional().catch(undefined),
});

export type DemoParams = z.infer<typeof demoParamsSchema>;

export function parseDemoParams(search: Record<string, string | string[] | undefined> | URLSearchParams): DemoParams {
  const entries =
    search instanceof URLSearchParams
      ? Object.fromEntries(search)
      : Object.fromEntries(Object.entries(search).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return demoParamsSchema.parse(entries);
}

export async function buildDemoBook(
  market: MarketCode,
  params: DemoParams
): Promise<{ book: Book; name: NameContext | null }> {
  if (params.verzia) {
    const stored = await loadBookVersion(params.verzia);
    if (stored) return { book: stored, name: null };
  }

  const language = params.jazyk ?? getMarket(market).uiLanguage;
  const resolved = await resolveName(params.meno, language, params.rod);
  const name: NameContext = { forms: resolved.forms, gender: resolved.gender, declinable: resolved.declinable };
  const input = sampleBookInput({
    language,
    age: params.vek,
    style: params.styl,
    layout: params.layout,
    format: params.format,
    pageCount: params.strany,
    name,
  });

  const demo = await getDemoIllustrations(params.styl);
  const spreads = LAYOUT_IMAGE_RATIO[input.options.layout] === "2:1" ? demo.wide : demo.square;
  input.images = {
    spreads: input.story.spreads.map((_, i) => spreads[i % spreads.length]),
    heroFullBody: demo.heroFullBody,
    heroPortrait: demo.heroPortrait,
  };
  input.options = {
    ...input.options,
    cover: params.obalka,
    theme: params.tema ?? DEFAULT_THEME_FOR_STYLE[params.styl],
    fontPair: params.pismo ?? DEFAULT_FONT_FOR_LAYOUT[input.options.layout],
    titlePosition: params.nazov ?? DEFAULT_TITLE_POSITION[params.obalka],
    endpaper: params.predsadka,
    frames: params.ramiky === "1",
  };
  return { book: buildBook(input), name };
}
