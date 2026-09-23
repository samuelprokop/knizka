/*
  Texty knihy idú výhradne cez jazykový modul: dosadenie mena a rodu
  (renderNameTokens) a typografia jazyka (applyTypography).
*/

import type { BookLanguage } from "@/i18n/locales";
import { applyTypography, renderNameTokens, type NameContext } from "@/lib/language";

export function personalize(template: string, name: NameContext, language: BookLanguage, fallback?: string) {
  return applyTypography(renderNameTokens(template, name, fallback), language);
}

/**
 * Rozdelí text na dve časti čo najbližšie k polovici – prednostne za vetou,
 * potom za čiarkou, nakoniec medzi slovami. Nezlomiteľné medzery sa nedelia.
 */
export function splitText(text: string): [string, string] {
  const middle = text.length / 2;
  const candidates = (pattern: RegExp) =>
    [...text.matchAll(pattern)].map((m) => (m.index ?? 0) + m[0].length).filter((i) => i > 0 && i < text.length);

  // Každá polovica má len polovicu miesta – rozdelenie musí byť takmer vyvážené.
  const rules: [RegExp, number][] = [
    [/[.!?…“]\s+/g, 0.15],
    [/[,;:–]\s+/g, 0.12],
    [/ +/g, 1],
  ];
  for (const [pattern, tolerance] of rules) {
    const positions = candidates(pattern);
    if (positions.length === 0) continue;
    const best = positions.reduce((a, b) => (Math.abs(b - middle) < Math.abs(a - middle) ? b : a));
    if (Math.abs(best - middle) > text.length * tolerance) continue;
    return [text.slice(0, best).trim(), text.slice(best).trim()];
  }
  return [text, ""];
}
