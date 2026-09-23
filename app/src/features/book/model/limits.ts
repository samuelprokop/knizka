/*
  Limity znakov textu dvojstrany podľa layoutu a formátu. Používa ich editor
  (počítadlo znakov), konfigurátor (ponuka úrovne pri prvom čítaní) aj test sadzby.
*/

import type { BookFormat, LayoutId } from "@/config/catalog";
import { LAYOUT_SPECS } from "../design";
import type { Book } from "./types";

export const maxSpreadChars = (layout: LayoutId, format: BookFormat) => LAYOUT_SPECS[layout].maxChars[format];

export function textFits(text: string, layout: LayoutId, format: BookFormat) {
  return [...text].length <= maxSpreadChars(layout, format);
}

export type TextOverflow = { spread: number; layout: LayoutId; length: number; max: number };

/** Dvojstrany, ktorých text prekračuje limit layoutu. */
export function findTextOverflows(book: Pick<Book, "parts" | "options">): TextOverflow[] {
  const overflows: TextOverflow[] = [];
  for (const part of book.parts) {
    if (part.kind !== "story_spread") continue;
    const max = maxSpreadChars(part.layout, book.options.format);
    const length = [...part.text].length;
    if (length > max) overflows.push({ spread: part.spread, layout: part.layout, length, max });
  }
  return overflows;
}
