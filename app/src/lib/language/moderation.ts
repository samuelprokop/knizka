/*
  Moderácia mien a venovaní (S9): vulgarizmy, urážky a zakázané mená pre SK aj CZ.
  Čistá funkcia – beží v konfigurátore (okamžitá odozva) aj na serveri (záväzná kontrola).

  Postup: normalizácia (malé písmená, bez diakritiky, náhrady 0→o, 4→a, @→a…,
  zlúčenie opakovaných písmen) → hľadanie koreňov. Zoznam je zámerne koreňový,
  aby zachytil odvodeniny (vyjebaný, pojebať, kurvička); test overuje, že ani jedno
  meno zo slovníka nie je zachytené omylom.

  Výsledok „review“ neblokuje – podozrivý prípad ide na ručné preverenie.
*/

import { LIMITS } from "@/config/catalog";
import type { BookLanguage } from "@/i18n/locales";

export type ModerationResult =
  | { status: "ok" }
  | { status: "blocked"; reason: "profanity" | "forbidden" | "invalid" | "length" }
  | { status: "review"; reason: "suspicious" | "profanity" };

/**
 * Korene vulgarizmov a urážok (po normalizácii, bez diakritiky).
 * Spoločné pre SK aj CZ – jazyky sú si blízke a zákazník môže písať v ktoromkoľvek.
 */
const PROFANITY_ROOTS: Record<BookLanguage | "common", string[]> = {
  common: [
    "kurv", "kokot", "piča", "pica", "picu", "pice", "pici", "jeb", "chuj", "zmrd", "mrdk", "mrdat",
    "mrdn", "curak", "hovn", "sracka", "sracky", "srack", "prdel", "debil", "kreten", "idiot",
    "buzna", "buzerant", "buzik", "negr", "nigger", "nigga", "cigan", "teplous", "kunda",
    "fuck", "shit", "bitch", "whore", "cunt", "penis", "vagin", "ciciny",
    "hajzl", "zasran", "posran", "vysran", "vyser", "devka", "dziv", "suka", "sukat",
    "sulin", "kripl", "retard", "hitler", "fasist",
  ],
  sk: ["pojeb", "rozjeb", "odjeb", "skurv", "pičo", "hovad"],
  cs: ["kurev", "pojeb", "vyjeb", "nasrat", "hovad", "curaci"],
};

/**
 * Korene, ktoré sú súčasťou bežných slov (kopica, špica) – hľadajú sa len
 * na začiatku slova, nie hocikde vnútri. Slová s bežným významom (židle, kokos,
 * somár, sviňa) v zozname zámerne nie sú – nález by bol častejšie omyl ako urážka.
 */
const WORD_START_ONLY = new Set(["piča", "pica", "picu", "pice", "pici", "pičo", "suka", "sukat", "penis", "idiot", "debil", "cigan", "negr"]);

/** Mená, ktoré sa dieťaťu v knihe nedajú (nie vulgárne, ale nevhodné). Porovnáva sa celé meno. */
const FORBIDDEN_NAMES = [
  "hitler", "stalin", "satan", "lucifer", "belzebub", "antikrist", "diabol", "dabel", "certik",
  "nazi", "covid", "korona", "kovid", "test", "xxx", "admin", "null", "undefined", "meno", "jmeno", "dieta", "dite",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

/** Malé písmená, bez diakritiky, leetspeak → písmená, bez oddeľovačov, opakované písmená zlúčené. */
export function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1");
}

const normalizedRoots = (language: BookLanguage) =>
  [...PROFANITY_ROOTS.common, ...PROFANITY_ROOTS[language]].map((root) => ({
    root: normalizeForModeration(root),
    wordStartOnly: WORD_START_ONLY.has(root),
  }));

const hasLongRun = (s: string) => /(\p{L})\1\1/iu.test(s);

/** Kontrola mena dieťaťa alebo postavy (krok 1 a 4 konfigurátora). */
export function moderateName(rawName: string, language: BookLanguage): ModerationResult {
  const name = rawName.trim().replace(/\s+/g, " ");
  const letters = [...name.replace(/[\s'’-]/g, "")];
  if (letters.length < LIMITS.nameMinChars || [...name].length > LIMITS.nameMaxChars) {
    return { status: "blocked", reason: "length" };
  }
  const normalized = normalizeForModeration(name);
  if (FORBIDDEN_NAMES.includes(normalized)) return { status: "blocked", reason: "forbidden" };
  const parts = name.split(/[\s'’-]+/).map(normalizeForModeration);
  for (const { root, wordStartOnly } of normalizedRoots(language)) {
    const hit = wordStartOnly ? parts.some((part) => part.startsWith(root)) : normalized.includes(root);
    if (hit) return { status: "blocked", reason: "profanity" };
  }

  // Písmená ľubovoľnej abecedy, medzera (dvojité meno), spojovník a apostrof (D'Artagnan).
  // Až po vulgarizmoch, aby „K0k0t“ bol vykázaný ako vulgarizmus, nie preklep.
  if (!/^\p{L}+(?:[ '’-]\p{L}+)*$/u.test(name)) return { status: "blocked", reason: "invalid" };

  // Meno bez samohlásky („Brrr“) alebo s trojitým písmenom („Annna“) – skôr preklep či žart.
  const plain = name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!/[aeiouy]/.test(plain) || hasLongRun(name)) return { status: "review", reason: "suspicious" };
  return { status: "ok" };
}

/**
 * Kontrola voľného textu (venovanie, list od rodiča, text zadnej strany).
 * Vracia nájdené slová; nález = ručné preverenie, nie automatické zamietnutie.
 */
export function findProfanity(text: string, language: BookLanguage): string[] {
  const roots = normalizedRoots(language);
  const found: string[] = [];
  for (const word of text.match(/[\p{L}\p{N}@$!*]+/gu) ?? []) {
    const normalized = normalizeForModeration(word);
    if (!normalized) continue;
    const hit = roots.some(({ root, wordStartOnly }) =>
      wordStartOnly ? normalized.startsWith(root) : normalized.includes(root)
    );
    if (hit) found.push(word);
  }
  return found;
}

export function moderateText(text: string, language: BookLanguage): ModerationResult {
  return findProfanity(text, language).length ? { status: "review", reason: "profanity" } : { status: "ok" };
}
