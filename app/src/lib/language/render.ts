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
 * Typografia jazyka (J7) pre sadzbu:
 *  - nezlomiteľná medzera po jednopísmenových predložkách a spojkách („a v lese“),
 *  - úvodzovky „ “ a ‚ ‘ namiesto rovných,
 *  - pomlčka – namiesto spojovníka medzi medzerami, pred ňou nezlomiteľná medzera
 *    (pomlčka nesmie začínať riadok),
 *  - trojbodka …, zlúčenie viacnásobných medzier,
 *  - nezlomiteľná medzera v dátumoch (21. 8.), medzi číslom a jednotkou (5 km)
 *    a po skratkách pred menom či číslom (sv. Mikuláš, p. učiteľka, č. 5).
 * Delenie slov je samostatne v ./hyphenation (len server).
 */
// Jednopísmenové predložky a spojky – v SK aj CZ rovnaké; ďalší jazyk dodá vlastné.
const SINGLE_LETTER_WORDS: Record<BookLanguage, string> = {
  sk: "aAiIkKoOsSuUvVzZ",
  cs: "aAiIkKoOsSuUvVzZ",
};

// Skratky, za ktorými nesmie byť koniec riadku.
const ABBREVIATIONS: Record<BookLanguage, string[]> = {
  sk: ["sv", "p", "pí", "č", "tzv", "napr", "str", "Dr", "Ing", "Mgr"],
  cs: ["sv", "p", "pí", "č", "tzv", "např", "tj", "str", "Dr", "Ing", "Mgr"],
};

const UNITS = "km|m|cm|mm|kg|g|l|ml|h|min|s|°C|%|€|Kč|EUR|CZK";

const NBSP = "\u00A0";

export function applyTypography(text: string, language: BookLanguage) {
  // Lookbehind, aby fungovali aj reťazce „a v lese“ (predložka hneď po predložke).
  const nbspAfterSingle = new RegExp(`(?<=^|[\\s(„‚–])([${SINGLE_LETTER_WORDS[language]}]) `, "g");
  const abbreviations = new RegExp(`(?<=^|[\\s(„])(${ABBREVIATIONS[language].join("|")})\\. (?=[\\p{L}\\d])`, "gu");
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\.\.\./g, "…")
    .replace(/ +[-–] +/g, `${NBSP}– `)
    .replace(/"([^"]*)"/g, "„$1“")
    .replace(/(?<=^|[\s(„])'([^']*)'/g, "‚$1‘")
    .replace(/(\d+\.) (?=\d+\.)/g, `$1${NBSP}`)
    .replace(new RegExp(`(\\d) (?=(?:${UNITS})(?![\\p{L}]))`, "gu"), `$1${NBSP}`)
    .replace(abbreviations, `$1.${NBSP}`)
    .replace(nbspAfterSingle, `$1${NBSP}`);
}
