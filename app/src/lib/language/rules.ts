/*
  Návrh tvarov mena pravidlami podľa zakončenia a rodu (J4) – pre mená mimo
  slovníka. Výsledok je len NÁVRH: zákazník ho potvrdí na vzorových vetách
  a objednávka ide na jazykovú kontrolu. Presnosť drží slovník, nie pravidlá.
*/

import type { BookLanguage } from "@/i18n/locales";
import type { Gender, NameForms } from "./types";

const same = (name: string): NameForms => ({
  N: name, G: name, D: name, A: name, V: name, L: name, I: name,
});

const endsWithAny = (s: string, suffixes: string[]) => suffixes.some((x) => s.endsWith(x));

// ---------------------------------------------------------------- slovenčina

function skFeminine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("ia")) {
    // Mária, Lucia, Júlia
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}e`, D: `${stem}i`, A: `${stem}u`, V: name, L: `${stem}i`, I: `${stem}ou` };
  }
  if (lower.endsWith("a")) {
    const stem = name.slice(0, -1);
    // Mäkké zakončenie kmeňa (Maja, Soňa) – vzor ulica, inak žena.
    const soft = endsWithAny(stem.toLowerCase(), ["j", "c", "č", "š", "ž", "ď", "ť", "ň", "dz", "dž"]);
    const dl = soft ? `${stem}i` : `${stem}e`;
    return { N: name, G: soft ? `${stem}e` : `${stem}y`, D: dl, A: `${stem}u`, V: name, L: dl, I: `${stem}ou` };
  }
  return null;
}

function skMasculine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("o")) {
    // Janko, Miško, Maťko
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  if (lower.endsWith("a")) {
    // Nikola, Luka – vzor hrdina
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}u`, D: `${stem}ovi`, A: `${stem}u`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  if (/[bcčdďfghjklľmnňpqrřsštťvwxzž]$/i.test(lower)) {
    let stem = name;
    // Vkladné e: Marek → Marka, Peter → Petra, Pavol → Pavla
    if (endsWithAny(lower, ["ek"]) && name.length > 3) stem = `${name.slice(0, -2)}k`;
    else if (endsWithAny(lower, ["er"]) && name.length > 4) stem = `${name.slice(0, -2)}r`;
    else if (lower === "pavol") stem = "Pavl";
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  return null;
}

// ---------------------------------------------------------------- čeština

const CS_DL_FEMININE: [string, string][] = [
  ["cha", "še"], ["ka", "ce"], ["ha", "ze"], ["ga", "ze"], ["ra", "ře"],
  ["da", "dě"], ["ta", "tě"], ["na", "ně"], ["ma", "mě"], ["pa", "pě"],
  ["ba", "bě"], ["va", "vě"], ["fa", "fě"],
];

function csFeminine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("ie")) {
    // Marie, Julie, Natálie
    const stem = name.slice(0, -1);
    return { N: name, G: name, D: `${stem}i`, A: `${stem}i`, V: name, L: `${stem}i`, I: `${stem}í` };
  }
  if (lower.endsWith("a")) {
    const stem = name.slice(0, -1);
    const rule = CS_DL_FEMININE.find(([end]) => lower.endsWith(end));
    const dl = rule ? name.slice(0, -rule[0].length) + rule[1] : `${stem}e`;
    const soft = endsWithAny(stem.toLowerCase(), ["j", "c", "č", "š", "ž", "ř", "ď", "ť", "ň"]);
    return {
      N: name,
      G: soft ? `${stem}e` : `${stem}y`,
      D: soft ? `${stem}i` : dl,
      A: `${stem}u`,
      V: `${stem}o`,
      L: soft ? `${stem}i` : dl,
      I: `${stem}ou`,
    };
  }
  return null;
}

function csMasculine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("a")) {
    // Honza, Jirka – vzor předseda
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}y`, D: `${stem}ovi`, A: `${stem}u`, V: `${stem}o`, L: `${stem}ovi`, I: `${stem}ou` };
  }
  if (!/[bcčdďfghjklmnňpqrřsštťvwxzž]$/i.test(lower)) return null;

  let stem = name;
  if (lower.endsWith("ek") && name.length > 3) stem = `${name.slice(0, -2)}k`; // Marek → Marka
  if (lower === "karel" || lower === "pavel") stem = `${name.slice(0, -2)}l`;

  const soft = endsWithAny(lower, ["š", "ž", "č", "ř", "j", "c", "ď", "ť", "ň", "x"]);
  if (soft) {
    // Tomáš, Ondřej – vzor muž
    return { N: name, G: `${stem}e`, D: `${stem}ovi`, A: `${stem}e`, V: `${stem}i`, L: `${stem}ovi`, I: `${stem}em` };
  }

  const stemLower = stem.toLowerCase();
  let vocative: string;
  if (endsWithAny(stemLower, ["k", "h", "ch", "g"])) vocative = `${stem}u`; // Marku, Honzíku
  else if (/[^aeiouyáéíóúýě]r$/.test(stemLower)) vocative = `${stem.slice(0, -1)}ře`; // Petře
  else vocative = `${stem}e`; // Jakube, Adame

  return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: vocative, L: `${stem}ovi`, I: `${stem}em` };
}

/** Navrhne tvary; ak zakončenie nepozná, vráti nesklonné meno (J5 – záložné vety). */
export function guessNameForms(
  name: string,
  gender: Gender,
  language: BookLanguage
): { forms: NameForms; declinable: boolean } {
  const trimmed = name.trim();
  const forms =
    language === "sk"
      ? gender === "girl"
        ? skFeminine(trimmed)
        : skMasculine(trimmed)
      : gender === "girl"
        ? csFeminine(trimmed)
        : csMasculine(trimmed);
  return forms ? { forms, declinable: true } : { forms: same(trimmed), declinable: false };
}
