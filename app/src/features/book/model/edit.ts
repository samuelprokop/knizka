/*
  Zmeny dvojstrany príbehu po vygenerovaní (editor „Do detailu“ v konfigurátore,
  generovanie ilustrácií po stranách). Uložená časť v book_pages.data je zdroj
  pre náhľad, e-knihu aj tlač – preto každá zmena textu či obrázka ide sem.
*/

import { LAYOUT_SPECS } from "../design";
import { splitText } from "./text";
import type { StorySpreadPart } from "./types";

export function withSpreadChanges(
  part: StorySpreadPart,
  changes: { text?: string; illustrationKey?: string | null }
): StorySpreadPart {
  const next: StorySpreadPart = { ...part };
  if (changes.text !== undefined) {
    next.text = changes.text;
    if (LAYOUT_SPECS[part.layout].splitText) next.textParts = splitText(changes.text);
  }
  if (changes.illustrationKey !== undefined) {
    next.illustration = changes.illustrationKey ? { key: changes.illustrationKey } : null;
  }
  return next;
}
