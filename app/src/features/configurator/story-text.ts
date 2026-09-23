/*
  Dosadenie mena, rodu a vlastných detailov (cesta B) do textu príbehu.
  Meno sa neskloňuje tu – tvary dodá jazykový modul (renderNameTokens).

  Značky detailov {detail:slot|predvolené} dosadzuje renderDetails z modelu
  knihy (balík C), aby konfigurátor aj renderer dávali rovnaký text.
*/

import { renderDetails } from "@/features/book/model/text";
import type { BookLanguage } from "@/i18n/locales";
import { applyTypography, CASE_KEYS, renderNameTokens, type NameContext, type NameForms } from "@/lib/language";
import type { DetailSlot } from "./model";

export { renderDetails };

export function renderStoryText(
  text: string,
  ctx: NameContext,
  language: BookLanguage,
  opts: { fallbackText?: string; details?: Partial<Record<DetailSlot, string>> } = {}
) {
  const withDetails = renderDetails(text, opts.details);
  const fallback = opts.fallbackText ? renderDetails(opts.fallbackText, opts.details) : undefined;
  return applyTypography(renderNameTokens(withDetails, ctx, fallback), language);
}

/** Sloty, ktoré sa v texte objavia aj v obrázku (majú vyhradenú oblasť v scéne). */
export const DETAIL_IN_PICTURE: readonly DetailSlot[] = ["toy", "friend"];

/**
 * Upravený text od zákazníka obsahuje meno už v tvaroch („Janka“). Pred
 * uložením sa tvary vrátia na značky {meno:X}, aby text ostal napojený na
 * jazykový modul (napr. pri zmene podoby mena). Dlhšie tvary majú prednosť,
 * rovnaké tvary pre viac pádov sa zapíšu ako prvý kľúč v poradí N G D A V L I.
 */
export function tokenizeName(text: string, forms: NameForms): string {
  const entries = CASE_KEYS.map((key) => [key, forms[key]] as const)
    .filter(([, form], i, all) => form && all.findIndex(([, f]) => f === form) === i)
    .sort((a, b) => b[1].length - a[1].length);
  let result = text;
  for (const [key, form] of entries) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?<![\\p{L}{:])${escaped}(?![\\p{L}}])`, "gu"), key === "N" ? "{meno}" : `{meno:${key}}`);
  }
  return result;
}
