/*
  Návrh tvarov mena pravidlami podľa zakončenia a rodu (J4) – pre mená mimo
  slovníka. Výsledok je len NÁVRH: zákazník ho potvrdí na vzorových vetách
  a objednávka ide na jazykovú kontrolu. Presnosť drží slovník, nie pravidlá.

  Pravidlá sa merajú proti slovníku (test „pravidlá vs. slovník“, cieľ ≥ 95 %).
  Čo pravidlá nevedia (Peter → Petra, Karel → Karla), rieši výnimka v slovníku.
*/

import type { BookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type Gender, type NameForms } from "./types";

const same = (name: string): NameForms => ({
  N: name, G: name, D: name, A: name, V: name, L: name, I: name,
});

const endsWithAny = (s: string, suffixes: string[]) => suffixes.some((x) => s.endsWith(x));

const VOWELS = "aáäeéěiíoóôuúůyý";
const isVowel = (char: string | undefined) => Boolean(char) && VOWELS.includes(char!.toLowerCase());

/** Mäkké spoluhlásky s mäkčeňom stratia mäkčeň pred e/i/ě: Soňa → Soni, Káťa → Kátě. */
const DECARON: Record<string, string> = { ň: "n", ť: "t", ď: "d", ľ: "l", Ň: "N", Ť: "T", Ď: "D", Ľ: "L" };
const decaron = (stem: string) => {
  const last = stem.slice(-1);
  return DECARON[last] ? stem.slice(0, -1) + DECARON[last] : stem;
};

/** Mená s nevyslovovaným -h (Noah, Sarah, Hannah) – v knihe ako nesklonné. */
const silentH = (lower: string) => lower.endsWith("ah");

/** Prídavné skloňovanie mien na -é, -í, -i, -y: René → Reného, Jiří → Jiřího, Tomi → Tomiho. */
const adjectival = (name: string): NameForms => ({
  N: name, G: `${name}ho`, D: `${name}mu`, A: `${name}ho`, V: name, L: `${name}m`, I: `${name}m`,
});

// ---------------------------------------------------------------- slovenčina

const SK_SOFT = ["j", "c", "č", "š", "ž", "ď", "ť", "ň", "ľ", "dz", "dž"];

function skFeminine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("ia") && name.length > 2) {
    // Mária, Lucia, Júlia, Mia
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}e`, D: `${stem}i`, A: `${stem}u`, V: name, L: `${stem}i`, I: `${stem}ou` };
  }
  if (lower.endsWith("a")) {
    const stem = name.slice(0, -1);
    const stemLower = stem.toLowerCase();
    // Andrea, Lea – kmeň na samohlásku: Andrey, Andrei.
    if (isVowel(stemLower.slice(-1))) {
      return { N: name, G: `${stem}y`, D: `${stem}i`, A: `${stem}u`, V: name, L: `${stem}i`, I: `${stem}ou` };
    }
    // Mäkké zakončenie kmeňa (Maja, Soňa, Uršuľa) – vzor ulica, inak žena.
    if (endsWithAny(stemLower, SK_SOFT)) {
      const soft = decaron(stem);
      return { N: name, G: `${soft}e`, D: `${soft}i`, A: `${stem}u`, V: name, L: `${soft}i`, I: `${stem}ou` };
    }
    return { N: name, G: `${stem}y`, D: `${stem}e`, A: `${stem}u`, V: name, L: `${stem}e`, I: `${stem}ou` };
  }
  return null;
}

function skMasculine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (silentH(lower)) return null;
  if (lower.endsWith("o")) {
    // Janko, Miško, Hugo
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  if (lower.endsWith("a")) {
    // Nikola, Luka – vzor hrdina
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}u`, D: `${stem}ovi`, A: `${stem}u`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  if (/[éiíyý]$/.test(lower)) return adjectival(name);
  if (/[bcčdďfghjklľmnňpqrřsštťvwxzž]$/i.test(lower)) {
    let stem = name;
    // Vkladné e: Marek → Marka, Alexander → Alexandra, Silvester → Silvestra (Oliver, Dezider
    // ho nestrácajú), Vavrinec → Vavrinca, Pavol → Pavla, Peter → Petra.
    if (lower.endsWith("ek") && name.length > 3) stem = `${name.slice(0, -2)}k`;
    else if (/[^aeiouyáéíóúýäô][^aeiouyáéíóúýäô]er$/.test(lower)) stem = `${name.slice(0, -2)}r`;
    else if (/[^aeiouyáéíóúýäô]ec$/.test(lower) && name.length > 4) stem = `${name.slice(0, -2)}c`;
    else if (lower === "pavol") stem = "Pavl";
    else if (lower === "peter") stem = "Petr";
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: name, L: `${stem}ovi`, I: `${stem}om` };
  }
  return null;
}

// ---------------------------------------------------------------- čeština

/** Tvrdé kmene: 3. a 6. pád s hláskovou zmenou (Anička → Aničce, Petra → Petře). */
const CS_DL_FEMININE: [string, string][] = [
  ["cha", "še"], ["ka", "ce"], ["ha", "ze"], ["ga", "ze"], ["ra", "ře"],
  ["da", "dě"], ["ta", "tě"], ["na", "ně"], ["ma", "mě"], ["pa", "pě"],
  ["ba", "bě"], ["va", "vě"], ["fa", "fě"],
];

const CS_SOFT = ["š", "ž", "č", "ř", "j", "c", "ť", "ď", "ň"];
const CS_CARON = ["ť", "ď", "ň"];

function csFeminine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (lower.endsWith("ie")) {
    // Marie, Julie, Natálie
    const stem = name.slice(0, -1);
    return { N: name, G: name, D: `${stem}i`, A: `${stem}i`, V: name, L: `${stem}i`, I: `${stem}í` };
  }
  if (lower.endsWith("e") && !isVowel(lower.slice(-2, -1))) {
    // Alice, Libuše – vzor růže (Zoe, Chloe so samohláskou pred -e sú nesklonné).
    const stem = name.slice(0, -1);
    return { N: name, G: name, D: `${stem}i`, A: `${stem}i`, V: name, L: `${stem}i`, I: `${stem}í` };
  }
  if (lower.endsWith("ia") && name.length > 2) {
    // Mia, Lia, Olivia – kmeň na -i
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}i`, D: `${stem}i`, A: `${stem}u`, V: `${stem}o`, L: `${stem}i`, I: `${stem}ou` };
  }
  if (lower.endsWith("uš")) {
    // Danuš, Liduš – vzor kost
    return { N: name, G: `${name}e`, D: `${name}i`, A: name, V: `${name}i`, L: `${name}i`, I: `${name}í` };
  }
  if (lower.endsWith("a")) {
    const stem = name.slice(0, -1);
    const last = stem.slice(-1).toLowerCase();
    const common = { N: name, A: `${stem}u`, V: `${stem}o`, I: `${stem}ou` };
    if (CS_CARON.includes(last)) {
      // Káťa → Káti, Kátě; Soňa → Soni, Soně
      const soft = decaron(stem);
      return { ...common, G: `${soft}i`, D: `${soft}ě`, L: `${soft}ě` };
    }
    if (CS_SOFT.includes(last)) {
      // Anča → Anči, Anče; Nataša → Nataši, Nataše
      return { ...common, G: `${stem}i`, D: `${stem}e`, L: `${stem}e` };
    }
    const rule = CS_DL_FEMININE.find(([end]) => lower.endsWith(end));
    const dl = rule ? name.slice(0, -rule[0].length) + rule[1] : `${stem}e`;
    return { ...common, G: `${stem}y`, D: dl, L: dl };
  }
  return null;
}

/** Vkladné e mizne: Karel → Karla, Pavel → Pavla, Havel → Havla. */
const CS_MOBILE_E_EL = new Set(["karel", "pavel", "havel"]);

function csMasculine(name: string): NameForms | null {
  const lower = name.toLowerCase();
  if (silentH(lower)) return null;
  if (lower.endsWith("a")) {
    // Honza, Jirka – vzor předseda; mäkký kmeň: Míša → Míši, Péťa → Péti
    const stem = name.slice(0, -1);
    const last = stem.slice(-1).toLowerCase();
    const genitive = CS_SOFT.includes(last) ? `${decaron(stem)}i` : `${stem}y`;
    return { N: name, G: genitive, D: `${stem}ovi`, A: `${stem}u`, V: `${stem}o`, L: `${stem}ovi`, I: `${stem}ou` };
  }
  if (lower.endsWith("o")) {
    // Hugo, Ivo, Leo
    const stem = name.slice(0, -1);
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: name, L: `${stem}ovi`, I: `${stem}em` };
  }
  if (/[éíý]$/.test(lower)) return adjectival(name); // René, Jiří
  if (lower.endsWith("ius") && name.length > 4) {
    // Julius → Julia, Julie (latinské -us odpadá)
    const stem = name.slice(0, -2);
    return { N: name, G: `${stem}a`, D: `${stem}ovi`, A: `${stem}a`, V: `${stem}e`, L: `${stem}ovi`, I: `${stem}em` };
  }
  if (!/[bcčdďfghjklmnňpqrřsštťvwxzž]$/i.test(lower)) return null;

  let stem = name;
  const mobileE = lower.match(/([ndt])ěk$/);
  if (mobileE) {
    // Zdeněk → Zdeňka, Luděk → Luďka
    const soft = { n: "ň", d: "ď", t: "ť" }[mobileE[1] as "n" | "d" | "t"];
    stem = `${name.slice(0, -3)}${soft}k`;
  } else if (lower.endsWith("ek") && name.length > 3) stem = `${name.slice(0, -2)}k`; // Marek → Marka
  else if (/[^aeiouyáéíóúýě]ec$/.test(lower) && name.length > 4) stem = `${name.slice(0, -2)}c`; // Vavřinec
  else if (CS_MOBILE_E_EL.has(lower)) stem = `${name.slice(0, -2)}l`;

  const stemLower = stem.toLowerCase();
  if (endsWithAny(stemLower, [...CS_SOFT, "x"])) {
    // Tomáš, Ondřej, Ignác – vzor muž; -ec: Vavřinec → Vavřinče
    const vocative = /[^aeiouyáéíóúýě]ec$/.test(lower) ? `${stem.slice(0, -1)}če` : `${stem}i`;
    return { N: name, G: `${stem}e`, D: `${stem}ovi`, A: `${stem}e`, V: vocative, L: `${stem}ovi`, I: `${stem}em` };
  }

  let vocative: string;
  if (endsWithAny(stemLower, ["k", "h", "ch", "g"])) vocative = `${stem}u`; // Marku, Honzíku
  else if (/[^aeiouyáéíóúýě]r$/.test(stemLower)) vocative = `${stem.slice(0, -1)}ře`; // Petře
  else if (stemLower.endsWith("el")) vocative = `${stem}i`; // Samueli, Danieli
  else vocative = `${stem}e`; // Jakube, Adame, Karle

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
  if (!forms) return { forms: same(trimmed), declinable: false };
  // Jednotné poradie kľúčov N G D A V L I (čitateľnosť slovníka a porovnaní).
  const ordered = Object.fromEntries(CASE_KEYS.map((key) => [key, forms[key]])) as NameForms;
  return { forms: ordered, declinable: true };
}
