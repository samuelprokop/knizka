import type { BookLanguage } from "@/i18n/locales";

/**
 * Pomenované tvary mena. Slovenčina aj čeština používajú 7 kľúčov
 * (v SK je V = N, lebo slovenčina oslovuje nominatívom). Ďalší jazyk môže
 * mať iné kľúče – modul nepredpokladá pevný počet pádov.
 */
export const CASE_KEYS = ["N", "G", "D", "A", "V", "L", "I"] as const;
export type CaseKey = (typeof CASE_KEYS)[number];
export type NameForms = Record<CaseKey, string>;

export type Gender = "girl" | "boy";

export type ResolvedName = {
  name: string;
  language: BookLanguage;
  gender: Gender;
  forms: NameForms;
  declinable: boolean;
  /** Tvary zo slovníka overeného korektorom. Inak ide objednávka na jazykovú kontrolu (J4). */
  verified: boolean;
  /** Domácke podoby na výber (J2). */
  diminutives: string[];
};

/** Kontext pre dosadenie mena a rodu do textu so značkami {meno:X} a {rod:a|b}. */
export type NameContext = {
  forms: NameForms;
  gender: Gender;
  declinable: boolean;
};
