/*
  Parsovanie hesiel Wikislovníka (cs.wiktionary.org, sk.wiktionary.org; CC BY-SA 4.0).
  Z hesla berieme: rod, tvary jednotného čísla, domácke podoby a základné meno
  (pri domáckej podobe). Plurál ani preklady nepotrebujeme.
*/

import type { Gender, NameForms } from "../../src/lib/language/types";

export type WiktionaryName = {
  gender: Gender;
  /** Tvary podľa hesla; SK heslá vokatív nemajú – doplní sa V = N. */
  forms: NameForms;
  diminutives: string[];
  baseName: string | null;
};

type Lang = "sk" | "cs";

const LANGUAGE_HEADING: Record<Lang, RegExp> = {
  cs: /^==\s*čeština\s*==\s*$/im,
  sk: /^==\s*slovenčina\s*==\s*$/im,
};

const TEMPLATE: Record<Lang, string> = { cs: "Substantivum (cs)", sk: "Podstatné meno (sk)" };

const PARAMS: Record<Lang, Record<keyof NameForms, string | null>> = {
  cs: { N: "snom", G: "sgen", D: "sdat", A: "sacc", V: "svoc", L: "sloc", I: "sins" },
  sk: { N: "snom", G: "sgen", D: "sdat", A: "saku", V: null, L: "slok", I: "sinš" },
};

const NAME_WORD = /^\p{Lu}[\p{Ll}]+$/u;

function languageSection(wikitext: string, lang: Lang): string | null {
  const heading = wikitext.match(LANGUAGE_HEADING[lang]);
  if (!heading || heading.index === undefined) return null;
  const rest = wikitext.slice(heading.index + heading[0].length);
  const next = rest.search(/^==[^=].*==\s*$/m);
  return (next === -1 ? rest : rest.slice(0, next)).replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, "");
}

/** Hodnota parametra: „[[Janu]] / [[Janovi]]“ → ["Janu", "Janovi"]. */
function variants(value: string): string[] {
  return value
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/\{\{[^}]*\}\}|'''|''/g, "")
    .split(/\s*[/,]\s*/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function templateParams(section: string, name: string): Map<string, string> | null {
  const start = section.indexOf(`{{${name}`);
  if (start === -1) return null;
  const end = section.indexOf("}}", start);
  const body = section.slice(start + name.length + 2, end === -1 ? undefined : end);
  const params = new Map<string, string>();
  for (const part of body.split(/\n\s*\|/)) {
    const eq = part.indexOf("=");
    if (eq > 0) params.set(part.slice(0, eq).replace(/^\s*\|/, "").trim(), part.slice(eq + 1).trim());
  }
  return params;
}

/** Podsekcia (=== podstatné jméno ===) s vlastným menom – heslo môže mať aj všeobecné podstatné meno. */
function properNounBlocks(section: string): string[] {
  const blocks = section.split(/^===(?!=)[^=\n]*===\s*$/m);
  return blocks.filter((b) => /vlastní jméno|vlastné meno/.test(b));
}

function pickForm(key: keyof NameForms, options: string[], gender: Gender): string | undefined {
  if (!options.length) return undefined;
  // Pri mužských menách je v D a L živý tvar na -ovi (Petrovi, nie Petru).
  if (gender === "boy" && (key === "D" || key === "L")) {
    return options.find((o) => o.endsWith("ovi")) ?? options[0];
  }
  return options[0];
}

function linksAfterMarkers(text: string, markers: RegExp): string[] {
  const result: string[] = [];
  for (const segment of text.split(/;|\n/)) {
    if (!markers.test(segment)) continue;
    // Za značkou nasledujú odkazy až po ďalšiu značku inej kategórie.
    const afterMarker = segment.split(/\{\{Príznak2?\|[^}]*\}\}|\{\{Příznak[yů]?2?\|[^}]*\}\}/);
    const markerList = [...segment.matchAll(/\{\{Pr[íi]zna[kc]\w*\|([^}]*)\}\}/g)].map((m) => m[1]);
    markerList.forEach((marker, i) => {
      if (!markers.test(marker)) return;
      for (const m of (afterMarker[i + 1] ?? "").matchAll(/\[\[([^\]|#]+)/g)) {
        if (NAME_WORD.test(m[1].trim())) result.push(m[1].trim());
      }
    });
  }
  return result;
}

export function parseWiktionaryName(wikitext: string, lang: Lang, title: string): WiktionaryName | null {
  const section = languageSection(wikitext, lang);
  if (!section) return null;

  for (const block of properNounBlocks(section)) {
    const gender: Gender | null = /rod mužský|mužský rod/.test(block)
      ? "boy"
      : /rod ženský|ženský rod/.test(block)
        ? "girl"
        : null;
    if (!gender) continue;

    // Musí ísť o krstné meno (alebo domácku podobu), nie priezvisko či miestny názov.
    const meaning = block.split(/^====\s*(?:význam|Význam)\s*====\s*$/m)[1]?.split(/^====/m)[0] ?? "";
    const diminutiveOf = meaning.match(/(?:dom\.|zdrob\.|hypokor)[^\n]*?\[\[([^\]|#]+)/);
    const isGivenName = /křestní jméno|krstné meno|rodné meno/.test(meaning) || Boolean(diminutiveOf);
    if (!isGivenName) continue;

    const params = templateParams(block, TEMPLATE[lang]);
    if (!params) continue;
    const forms = {} as NameForms;
    let complete = true;
    for (const [key, param] of Object.entries(PARAMS[lang]) as [keyof NameForms, string | null][]) {
      if (!param) continue;
      const value = pickForm(key, variants(params.get(param) ?? ""), gender);
      if (!value) complete = false;
      else forms[key] = value;
    }
    if (!complete) continue;
    if (lang === "sk") forms.V = forms.N;
    if (forms.N !== title) continue;

    const synonyms = block.split(/^====\s*(?:synonyma|Synonymá)\s*====\s*$/m)[1]?.split(/^====/m)[0] ?? "";
    const related = block.split(/^====\s*(?:Príbuzné slová)\s*====\s*$/m)[1]?.split(/^====/m)[0] ?? "";
    const diminutives = new Set(linksAfterMarkers(synonyms, /dom\.|zdrob\./));
    // SK: domácke podoby bývajú v „Príbuzné slová“ ako {{Zoznam|sk|Janík|Janko|…}}.
    for (const item of related.replace(/\{\{Zoznam\|sk\|?/, "").split(/[|\n]/)) {
      const word = item.replace(/[[\]{}]/g, "").trim();
      if (NAME_WORD.test(word) && word !== title && word.slice(0, 2) === title.slice(0, 2)) diminutives.add(word);
    }
    diminutives.delete(title);

    return {
      gender,
      forms,
      diminutives: [...diminutives],
      baseName: diminutiveOf && diminutiveOf[1].trim() !== title ? diminutiveOf[1].trim() : null,
    };
  }
  return null;
}
