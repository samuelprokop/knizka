/*
  Validácie vstupov konfigurátora – čisté funkcie, rovnaké v klientovi
  (okamžitá chyba pod poľom) aj v server actions (dôvera sa nedáva klientovi).
  Výsledok je kľúč textu, nie hláška natvrdo.
*/

import { z } from "zod";

import { LIMITS } from "@/config/catalog";
import type { MessageKey } from "@/i18n/messages";

/** Písmená (aj s diakritikou), medzera a spojovník – „Anna Mária“, „Jean-Luc“. */
const NAME_PATTERN = /^[\p{L}]+(?:[ -][\p{L}]+)*$/u;

/*
  PLACEHOLDER: krátky zoznam slov a mien známych osobností, ktoré v knihe
  nepoužijeme. Plný zoznam spravuje redakcia v administrácii (balík E).
*/
const BLOCKED_NAMES = new Set(["kokot", "debil", "hitler", "stalin", "putin", "satan", "lucifer"]);

export type NameError = Extract<
  MessageKey,
  "child.name.invalid_chars" | "child.name.too_long" | "child.name.not_allowed"
>;

export const normalizeName = (raw: string) => raw.trim().replace(/\s+/g, " ");

export function validateChildName(raw: string): NameError | null {
  const name = normalizeName(raw);
  if (name.length > LIMITS.nameMaxChars) return "child.name.too_long";
  if (name.length < LIMITS.nameMinChars || !NAME_PATTERN.test(name)) return "child.name.invalid_chars";
  const lower = name.toLocaleLowerCase();
  if (lower.split(/[ -]/).some((part) => BLOCKED_NAMES.has(part))) return "child.name.not_allowed";
  return null;
}

/** Prvé písmeno veľké – „janko“ → „Janko“, „anna mária“ → „Anna Mária“. */
export const capitalizeName = (name: string) =>
  normalizeName(name).replace(/(^|[ -])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase());

/** Vek, ktorý ponúka výber v kroku 1 (proces: 2 – 10 rokov). */
export const AGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** Príbehy sú písané pre 3 – 8 rokov; mimo sa zobrazí upozornenie, nie chyba. */
export const isAgeOutsideStories = (age: number) => age < 3 || age > 8;

export const emailSchema = z.email().max(254);

/** Voľný text do N znakov (detaily príbehu, venovanie…) – orezaný, bez riadiacich znakov. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
