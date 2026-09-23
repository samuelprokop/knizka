/*
  Anglický Wiktionary (en.wiktionary.org; CC BY-SA 4.0) – slovenské a české krstné mená.
  Tvary nie sú v hesle vypísané, generuje ich šablóna {{sk-ndecl}} / {{cs-ndecl}}
  (Lua modul podľa vzoru skloňovania); rozbalíme ju cez API a prečítame tabuľku.
*/

import type { Gender, NameForms } from "../../src/lib/language/types";

type Lang = "sk" | "cs";

const SECTION: Record<Lang, string> = { sk: "Slovak", cs: "Czech" };

export type EnWiktionaryHeadword = { gender: Gender; declTemplate: string };

/** Z hesla vyberie sekciu jazyka, rod krstného mena a šablónu skloňovania. */
export function parseEnHeadword(wikitext: string, lang: Lang): EnWiktionaryHeadword | null {
  const start = wikitext.search(new RegExp(`^==${SECTION[lang]}==\\s*$`, "m"));
  if (start === -1) return null;
  const rest = wikitext.slice(start + SECTION[lang].length + 4);
  const end = rest.search(/^==[^=]/m);
  const section = end === -1 ? rest : rest.slice(0, end);

  // Heslo môže mať viac etymológií – hľadáme blok s {{given name|…}}.
  for (const block of section.split(/^===+\s*Proper noun\s*===+\s*$/m).slice(1)) {
    const givenName = block.match(/\{\{given name\|(?:sk|cs)\|(male|female)/);
    const decl = block.match(new RegExp(`\\{\\{${lang}-ndecl\\|[^}]*\\}\\}`));
    if (!givenName || !decl) continue;
    return { gender: givenName[1] === "male" ? "boy" : "girl", declTemplate: decl[0] };
  }
  return null;
}

const CASES: Record<string, keyof NameForms> = {
  nom: "N", gen: "G", dat: "D", acc: "A", voc: "V", loc: "L", ins: "I",
};

/** Tvary jednotného čísla z rozbalenej tabuľky; SK nemá vokatív → V = N. */
export function parseExpandedTable(html: string, lang: Lang, gender: Gender): NameForms | null {
  const options: Partial<Record<keyof NameForms, string[]>> = {};
  const re = new RegExp(`lang-${lang} (nom|gen|dat|acc|voc|loc|ins)\\|s-form-of[^>]*>\\[\\[:[^|\\]]*\\|([^\\]]+)\\]\\]`, "g");
  for (const match of html.matchAll(re)) {
    const key = CASES[match[1]];
    (options[key] ??= []).push(match[2]);
  }
  const pick = (key: keyof NameForms) => {
    const list = options[key];
    if (!list?.length) return undefined;
    if (gender === "boy" && (key === "D" || key === "L")) return list.find((v) => v.endsWith("ovi")) ?? list[0];
    return list[0];
  };
  const forms = {} as NameForms;
  for (const key of ["N", "G", "D", "A", "V", "L", "I"] as const) {
    const value = key === "V" && lang === "sk" ? pick("N") : pick(key);
    if (!value) return null;
    forms[key] = value;
  }
  return forms;
}
