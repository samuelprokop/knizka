import "server-only";

/*
  Delenie slov pre sadzbu – LEN na serveri (české vzory sú pod GPL, viď patterns-cs.ts).
  Renderer (balík C) volá hyphenate() na hotový text strany po applyTypography().
*/

import type { BookLanguage } from "@/i18n/locales";
import { createHyphenator, hyphenateText, type Hyphenator } from "./hyphenate";
import * as cs from "./patterns-cs";
import * as sk from "./patterns-sk";

const PATTERNS: Record<BookLanguage, { PATTERNS: string; EXCEPTIONS: string }> = { sk, cs };
const cache = new Map<BookLanguage, Hyphenator>();

function hyphenatorFor(language: BookLanguage) {
  let hyphenator = cache.get(language);
  if (!hyphenator) {
    const { PATTERNS: patterns, EXCEPTIONS: exceptions } = PATTERNS[language];
    hyphenator = createHyphenator(patterns, exceptions, { leftMin: 2, rightMin: 3 });
    cache.set(language, hyphenator);
  }
  return hyphenator;
}

/**
 * Text s mäkkými spojovníkmi (U+00AD). `protect` = tvary mien, ktoré sa nedelia
 * (napr. Object.values(resolvedName.forms)).
 */
export function hyphenate(text: string, language: BookLanguage, protect: Iterable<string> = []) {
  return hyphenateText(text, hyphenatorFor(language), protect);
}
