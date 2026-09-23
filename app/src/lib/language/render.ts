/*
  Dosadenie mena a rodových tvarov do textu. Šablóna knihy nikdy neskloňuje
  sama – iba si pýta hotový tvar (Jazykový modul).

  Značky:
    {meno}            nominatív
    {meno:D}          tvar podľa kľúča (N G D A V L I)
    {rod:bol|bola}    tvar pre chlapca | dievča (J6)
*/

import type { BookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type CaseKey, type NameContext } from "./types";

const NAME_TOKEN = /\{meno(?::([A-Z]))?\}/g;
const GENDER_TOKEN = /\{rod:([^|}]*)\|([^}]*)\}/g;

const isCaseKey = (value: string): value is CaseKey => (CASE_KEYS as readonly string[]).includes(value);

/** Pri nesklonnom mene sa smie použiť len nominatív a oslovenie (J11). */
export function usesInflectedName(template: string) {
  for (const match of template.matchAll(NAME_TOKEN)) {
    const key = match[1];
    if (key && key !== "N" && key !== "V") return true;
  }
  return false;
}

export function renderNameTokens(
  template: string,
  ctx: NameContext,
  /** Záložná veta bez skloňovaného mena (J5), použije sa pri nesklonnom mene. */
  fallback?: string
): string {
  const source = !ctx.declinable && fallback && usesInflectedName(template) ? fallback : template;
  return source
    .replace(NAME_TOKEN, (_, key?: string) => {
      if (!key) return ctx.forms.N;
      if (!isCaseKey(key)) return ctx.forms.N;
      return ctx.declinable ? ctx.forms[key] : ctx.forms.N;
    })
    .replace(GENDER_TOKEN, (_, masculine: string, feminine: string) =>
      ctx.gender === "boy" ? masculine : feminine
    );
}

/**
 * Typografia jazyka (J7): nezlomiteľná medzera po jednopísmenových
 * predložkách a spojkách, slovenské/české úvodzovky „ “.
 */
// Jednopísmenové predložky a spojky – v SK aj CZ rovnaké; ďalší jazyk dodá vlastné.
const SINGLE_LETTER_WORDS: Record<BookLanguage, string> = {
  sk: "aAiIkKoOsSuUvVzZ",
  cs: "aAiIkKoOsSuUvVzZ",
};

export function applyTypography(text: string, language: BookLanguage) {
  // Lookbehind, aby fungovali aj reťazce „a v lese“ (predložka hneď po predložke).
  const nbspAfterSingle = new RegExp(`(?<=^|[\\s(„])([${SINGLE_LETTER_WORDS[language]}]) `, "g");
  return text
    .replace(nbspAfterSingle, "$1 ")
    .replace(/"([^"]*)"/g, "„$1“");
}
