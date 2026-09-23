/*
  Predvolené voľby knihy (proces: „Predvolené všade“). Konfigurátor (balík A)
  si z nich berie východzí stav kroku 6 a prepisuje len to, čo zákazník zmení.
*/

import {
  defaultsForAge,
  type BookFormat,
  type LayoutId,
  type PageCount,
  type StyleId,
} from "@/config/catalog";
import { DEFAULT_FONT_FOR_LAYOUT, DEFAULT_THEME_FOR_STYLE, DEFAULT_TITLE_POSITION } from "../design";
import type { BookOptions } from "./types";

export function defaultBookOptions(params: {
  age: number;
  style: StyleId;
  format?: BookFormat;
  pageCount?: PageCount;
  layout?: LayoutId;
}): BookOptions {
  const age = defaultsForAge(params.age);
  const layout = params.layout ?? age.layout;
  const cover = "hero_in_scene";
  return {
    format: params.format ?? "A5",
    pageCount: params.pageCount ?? 32,
    binding: "hardcover",
    style: params.style,
    layout,
    readingLevel: age.readingLevel,
    cover,
    theme: DEFAULT_THEME_FOR_STYLE[params.style],
    fontPair: DEFAULT_FONT_FOR_LAYOUT[layout],
    titlePosition: DEFAULT_TITLE_POSITION[cover],
    endpaper: "dots",
    frames: false,
    activities: age.activities,
    parentGuide: true,
    parentLetter: false,
    backPortrait: true,
  };
}
