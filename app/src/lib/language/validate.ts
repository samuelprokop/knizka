/*
  Kontroly šablóny edície pred publikovaním (J5, J11, J13, Pravidlá pre redaktorov).
  Čistá funkcia – volá ju administrácia pri písaní (balík E) aj test pri publikovaní.

  Kontroluje:
  - syntax značiek {meno}, {meno:X}, {rod:a|b}; neznáme značky a nespárované zátvorky,
  - každá veta so skloňovaným menom má záložnú vetu a tá sama neskloňuje (J5),
  - žiadne nalepené koncovky/privlastňovacie tvary z mena ({meno}ov, {meno}in),
  - čeština: oslovenie má byť vokatív {meno:V},
  - test sadzby: každý text sa vysadí s najkratším a najdlhším menom (2 a 12 znakov)
    v oboch rodoch aj s nesklonným menom; voliteľne kontrola limitu znakov layoutu.
*/

import type { BookLanguage } from "@/i18n/locales";
import { applyTypography, renderNameTokens, usesInflectedName } from "./render";
import { guessNameForms } from "./rules";
import { CASE_KEYS, type Gender, type NameContext } from "./types";

export type EditionTemplate = {
  title: string;
  annotation: string;
  spreads: { text: string; fallbackText?: string }[];
};

export type TemplateField = "title" | "annotation" | "text" | "fallbackText";

export type TemplateIssue = {
  severity: "error" | "warning";
  code:
    | "syntax"
    | "unknown_token"
    | "missing_fallback"
    | "fallback_inflected"
    | "inflected_without_fallback"
    | "attached_suffix"
    | "vocative"
    | "leftover_token"
    | "too_long";
  field: TemplateField;
  /** Index dvojstrany (0 = prvá); pri názve a anotácii chýba. */
  spread?: number;
  message: string;
};

export type TypesetSample = {
  field: TemplateField;
  spread?: number;
  hero: string;
  text: string;
  length: number;
};

export type TestHero = { label: string; ctx: NameContext };

/** Testovacie mená: najkratšie a najdlhšie povolené (2 a 12 znakov), oba rody, nesklonné. */
const TEST_NAMES: Record<BookLanguage, { name: string; gender: Gender }[]> = {
  sk: [
    { name: "Ed", gender: "boy" },
    { name: "Li", gender: "girl" },
    { name: "Maximiliánko", gender: "boy" },
    { name: "Alexandrínka", gender: "girl" },
    { name: "Noah", gender: "boy" },
  ],
  cs: [
    { name: "Ed", gender: "boy" },
    { name: "Li", gender: "girl" },
    { name: "Maximiliánek", gender: "boy" },
    { name: "Magdalénička", gender: "girl" },
    { name: "Zoe", gender: "girl" },
  ],
};

export function testHeroes(language: BookLanguage): TestHero[] {
  return TEST_NAMES[language].map(({ name, gender }) => {
    const { forms, declinable } = guessNameForms(name, gender, language);
    return { label: name, ctx: { forms, gender, declinable } };
  });
}

const TOKEN = /\{([^{}]*)\}/g;
const NAME_TOKEN_BODY = /^meno(?::(.+))?$/;
const GENDER_TOKEN_BODY = /^rod:([^|]*)\|([^|]*)$/;

function syntaxIssues(text: string, field: TemplateField, spread: number | undefined, language: BookLanguage): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  const at = { field, ...(spread !== undefined ? { spread } : {}) };

  let depth = 0;
  for (const char of text) {
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth < 0 || depth > 1) break;
  }
  if (depth !== 0) {
    issues.push({ severity: "error", code: "syntax", ...at, message: "Nespárované zložené zátvorky { }." });
  }

  for (const match of text.matchAll(TOKEN)) {
    const body = match[1];
    const name = body.match(NAME_TOKEN_BODY);
    if (name) {
      if (name[1] && !(CASE_KEYS as readonly string[]).includes(name[1])) {
        issues.push({
          severity: "error",
          code: "syntax",
          ...at,
          message: `Neznámy pád „${match[0]}“ – povolené sú ${CASE_KEYS.join(", ")}.`,
        });
      }
      continue;
    }
    if (body.startsWith("rod:")) {
      if (!GENDER_TOKEN_BODY.test(body)) {
        issues.push({ severity: "error", code: "syntax", ...at, message: `Značka „${match[0]}“ musí mať tvar {rod:chlapec|dievča}.` });
      }
      continue;
    }
    issues.push({ severity: "error", code: "unknown_token", ...at, message: `Neznáma značka „${match[0]}“.` });
  }

  // {meno}ov, {meno:G}in – koncovka nalepená na meno (privlastňovacie prídavné meno a pod.).
  if (/\{meno(?::[A-Z])?\}\p{L}/u.test(text)) {
    issues.push({
      severity: "error",
      code: "attached_suffix",
      ...at,
      message: "Za menom nesmie hneď nasledovať písmeno (napr. privlastňovací tvar „Jankov“). Preformulujte vetu.",
    });
  }

  // Čeština: oslovenie je vokatív – „{meno}!“ alebo „„{meno}, …“ skoro vždy znamená chýbajúce :V.
  if (language === "cs" && /(„|^|[.!?]\s+)\{meno\},|\{meno\}!/.test(text)) {
    issues.push({
      severity: "warning",
      code: "vocative",
      ...at,
      message: "Vyzerá to na oslovenie – v češtine použite vokatív {meno:V} (Aničko, Petře).",
    });
  }
  return issues;
}

export function validateEditionTemplate(
  edition: EditionTemplate,
  language: BookLanguage,
  options: { maxCharsPerSpread?: number; heroes?: TestHero[] } = {}
): { ok: boolean; issues: TemplateIssue[]; samples: TypesetSample[] } {
  const issues: TemplateIssue[] = [];
  const samples: TypesetSample[] = [];
  const heroes = options.heroes ?? testHeroes(language);

  const checkRender = (field: TemplateField, text: string, fallback: string | undefined, spread?: number, maxChars?: number) => {
    for (const hero of heroes) {
      const rendered = applyTypography(renderNameTokens(text, hero.ctx, fallback), language);
      const length = [...rendered].length;
      samples.push({ field, ...(spread !== undefined ? { spread } : {}), hero: hero.label, text: rendered, length });
      const at = { field, ...(spread !== undefined ? { spread } : {}) };
      if (/[{}]/.test(rendered)) {
        issues.push({ severity: "error", code: "leftover_token", ...at, message: `Po dosadení mena „${hero.label}“ ostala v texte značka.` });
      }
      if (maxChars && length > maxChars) {
        issues.push({
          severity: "error",
          code: "too_long",
          ...at,
          message: `S menom „${hero.label}“ má text ${length} znakov, limit layoutu je ${maxChars}.`,
        });
      }
    }
  };

  for (const field of ["title", "annotation"] as const) {
    const text = edition[field];
    issues.push(...syntaxIssues(text, field, undefined, language));
    // Názov a anotácia nemajú záložnú vetu – smú len nominatív a oslovenie.
    if (usesInflectedName(text)) {
      issues.push({
        severity: "error",
        code: "inflected_without_fallback",
        field,
        message: "Názov a anotácia smú používať len {meno} alebo {meno:V} (nemajú záložnú vetu).",
      });
    }
    checkRender(field, text, undefined);
  }

  edition.spreads.forEach((spread, index) => {
    issues.push(...syntaxIssues(spread.text, "text", index, language));
    if (spread.fallbackText !== undefined) issues.push(...syntaxIssues(spread.fallbackText, "fallbackText", index, language));

    if (usesInflectedName(spread.text) && !spread.fallbackText?.trim()) {
      issues.push({
        severity: "error",
        code: "missing_fallback",
        field: "text",
        spread: index,
        message: "Veta so skloňovaným menom potrebuje záložnú vetu pre nesklonné mená (J5).",
      });
    }
    if (spread.fallbackText && usesInflectedName(spread.fallbackText)) {
      issues.push({
        severity: "error",
        code: "fallback_inflected",
        field: "fallbackText",
        spread: index,
        message: "Záložná veta smie mať meno len v nominatíve ({meno}), v oslovení ({meno:V}) alebo žiadne.",
      });
    }
    checkRender("text", spread.text, spread.fallbackText, index, options.maxCharsPerSpread);
  });

  return { ok: !issues.some((i) => i.severity === "error"), issues, samples };
}
