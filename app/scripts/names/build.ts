/*
  Zostavenie slovníka mien (J1) a menín (J8) pre SK a CZ.

    npm run names:build     → app/data/names/{sk,cs}.json

  Postup: kalendáre menín + moderné mená + domácke podoby → heslá z Wikislovníka
  (tvary, rod, ďalšie domácke podoby) → kde heslo chýba, tvary navrhnú pravidlá.
  Stiahnuté stránky sa ukladajú do app/data/names/.cache/, ďalší beh je offline.
  Každý záznam nesie `source`, aby korektor vedel, čo overiť prednostne (rules).
*/

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { guessNameForms } from "../../src/lib/language/rules";
import { SEED_NAMES } from "../../src/lib/language/seed-names";
import type { Gender, NameForms } from "../../src/lib/language/types";
import { parseCsCalendar, parseSkCalendar, type CalendarEntry } from "./calendars";
import { DIMINUTIVES, MODERN_NAMES, OVERRIDES } from "./curated";
import type { DictionaryFile, DictionaryEntry, NameSource } from "./types";
import { parseEnHeadword, parseExpandedTable, type EnWiktionaryHeadword } from "./enwiktionary";
import { DATA_DIR, expandTemplates, fetchCategoryMembers, fetchPage, fetchPages } from "./wiki";
import { parseWiktionaryName, type WiktionaryName } from "./wiktionary";

type Lang = "sk" | "cs";

const WIKTIONARY_HOST: Record<Lang, string> = { sk: "sk.wiktionary.org", cs: "cs.wiktionary.org" };

const CALENDAR_PAGES = {
  sk: { host: "sk.wikipedia.org", title: "Meniny na Slovensku" },
  cz: { host: "cs.wikipedia.org", title: "Jmeniny v Česku" },
} as const;

const toForms = (value: string): NameForms => {
  const [N, G, D, A, V, L, I] = value.split(" ");
  return { N, G, D, A, V, L, I };
};
const indeclinable = (name: string): NameForms => toForms(Array(7).fill(name).join(" "));

/** Mužské mená na -a/-e a ženské na spoluhlásku – rod sa z koncovky odhadnúť nedá. */
const MASCULINE_ENDING_A = new Set([
  "Nikola", "Luka", "Kuzma", "Sáva", "Ilja", "Jozua", "Nikita", "Saša", "Joža", "Joshua", "Míša",
  "Honza", "Kuba", "Jirka", "Vojta", "Ondra", "Tonda", "Pepa", "Franta", "Venda", "Jenda", "Péťa",
  "Pája", "Kája", "Láďa", "Jarda", "Standa", "Ferda", "Zbyňa", "Míra", "Luboš",
]);
const FEMININE_CONSONANT = new Set([
  "Dagmar", "Ingrid", "Miriam", "Karin", "Ester", "Rút", "Rut", "Edit", "Judit", "Carmen", "Kristen",
  "Ruth", "Nikol", "Madlen", "Vivien", "Jasmin", "Kim", "Mercedes", "Beatris", "Alyson", "Amabel",
  "Iris", "Ráchel", "Rachel", "Noemi", "Abigail", "Lilian", "Ester", "Gertrúd", "Hedviga", "Isabel",
]);

function inferGender(name: string): Gender {
  if (MASCULINE_ENDING_A.has(name)) return "boy";
  if (FEMININE_CONSONANT.has(name)) return "girl";
  // -a, -e (Alice, Zoe, Marie), -i/-y (Naomi, Emily) → dievča; René, Noé (-é) a spoluhlásky → chlapec.
  return /[aeiy]$/.test(name) ? "girl" : "boy";
}

type Candidate = { name: string; gender?: Gender; common: boolean; baseName?: string };

function firstDateByName(entries: CalendarEntry[]) {
  const map = new Map<string, string>();
  // Oficiálne (tlačené) mená majú prednosť pred len priradenými.
  for (const entry of [...entries].sort((a, b) => Number(b.official) - Number(a.official))) {
    if (!map.has(entry.name)) map.set(entry.name, entry.date);
  }
  return map;
}

async function buildLanguage(
  lang: Lang,
  calendars: { sk: CalendarEntry[]; cz: CalendarEntry[] },
  sources: DictionaryFile["sources"]
): Promise<DictionaryEntry[]> {
  const ownCalendar = lang === "sk" ? calendars.sk : calendars.cz;
  const candidates = new Map<string, Candidate>();
  const add = (c: Candidate) => {
    const key = `${c.name}|${c.gender ?? "?"}`;
    const existing = candidates.get(key);
    if (existing) {
      existing.common ||= c.common;
      existing.baseName ??= c.baseName;
    } else candidates.set(key, { ...c });
  };

  for (const entry of ownCalendar) add({ name: entry.name, common: entry.official });
  // Krstné mená z kategórií anglického Wiktionary (rozširujú hlavne český zoznam).
  const language = lang === "sk" ? "Slovak" : "Czech";
  for (const kind of ["male", "female"]) {
    const titles = await fetchCategoryMembers("en.wiktionary.org", `Category:${language} ${kind} given names`, 1);
    for (const title of titles) if (/^\p{Lu}\p{Ll}+$/u.test(title)) add({ name: title, common: false });
  }
  for (const entry of MODERN_NAMES[lang]) add({ ...entry, common: true });
  for (const seed of SEED_NAMES.filter((s) => s.language === lang)) {
    add({ name: seed.forms.N, gender: seed.gender, common: true, baseName: seed.baseName });
  }

  // Heslá z Wikislovníka – dve kolá: mená, potom ich domácke podoby.
  const host = WIKTIONARY_HOST[lang];
  const parsed = new Map<string, WiktionaryName | null>();
  const refs = new Map<string, string>();
  // Mená, ktoré domáci Wikislovník nemá, skúsime v anglickom (šablóna {{sk-ndecl}} / {{cs-ndecl}}).
  const english = new Map<string, EnWiktionaryHeadword & { revid: number }>();
  const fetchRound = async (names: string[]) => {
    const pages = await fetchPages(host, names.filter((n) => !parsed.has(n)));
    for (const [title, page] of pages) {
      parsed.set(title, page ? parseWiktionaryName(page.wikitext, lang, title) : null);
      if (page) refs.set(title, `https://${host}/w/index.php?oldid=${page.revid}`);
    }
    const missing = [...pages.keys()].filter((title) => !parsed.get(title));
    for (const [title, page] of await fetchPages("en.wiktionary.org", missing)) {
      const headword = page ? parseEnHeadword(page.wikitext, lang) : null;
      if (page && headword) english.set(title, { ...headword, revid: page.revid });
    }
  };
  await fetchRound([...new Set([...candidates.values()].map((c) => c.name))]);

  // Rod mien bez zadaného rodu: Wikislovník, inak odhad podľa koncovky.
  for (const [key, c] of [...candidates]) {
    if (c.gender) continue;
    candidates.delete(key);
    add({ ...c, gender: parsed.get(c.name)?.gender ?? english.get(c.name)?.gender ?? OVERRIDES[lang][c.name]?.gender ?? inferGender(c.name) });
  }

  // Domácke podoby: ručný zoznam + Wikislovník (len pri bežných menách, aby sa slovník nenafúkol).
  const diminutiveMap = new Map<string, string[]>();
  for (const c of candidates.values()) {
    const curated = DIMINUTIVES[lang][c.name] ?? [];
    const fromWiki = c.common ? (parsed.get(c.name)?.diminutives ?? []) : [];
    const list = [...new Set([...curated, ...fromWiki])].filter((d) => d !== c.name);
    if (list.length) diminutiveMap.set(`${c.name}|${c.gender}`, list);
  }
  const diminutiveNames = [...diminutiveMap.values()].flat();
  await fetchRound(diminutiveNames);
  for (const [key, list] of diminutiveMap) {
    const [base, gender] = key.split("|") as [string, Gender];
    for (const d of list) add({ name: d, gender, common: true, baseName: base });
  }

  const skDates = firstDateByName(calendars.sk);
  const czDates = firstDateByName(calendars.cz);
  const seedByKey = new Map(SEED_NAMES.filter((s) => s.language === lang).map((s) => [`${s.forms.N}|${s.gender}`, s]));

  // Tvary z anglického Wiktionary – len pre mená, ktoré nemajú výnimku, seed ani domáce heslo.
  const needsEnglish = [...candidates.values()].filter((c) => {
    const wiki = parsed.get(c.name);
    const en = english.get(c.name);
    return (
      !OVERRIDES[lang][`${c.name}|${c.gender}`] &&
      !(OVERRIDES[lang][c.name]?.gender === c.gender) &&
      !seedByKey.has(`${c.name}|${c.gender}`) &&
      !(wiki && wiki.gender === c.gender) &&
      en?.gender === c.gender
    );
  });
  const expanded = await expandTemplates(
    "en.wiktionary.org",
    needsEnglish.map((c) => ({
      key: `${lang}:${c.name}`,
      text: english.get(c.name)!.declTemplate.replace(/\}\}$/, `|pagename=${c.name}}}`),
    }))
  );

  const entries: DictionaryEntry[] = [];
  for (const c of candidates.values()) {
    const gender = c.gender!;
    const override = OVERRIDES[lang][`${c.name}|${gender}`] ?? OVERRIDES[lang][c.name];
    const seed = seedByKey.get(`${c.name}|${gender}`);
    const wiki = parsed.get(c.name);
    const en = english.get(c.name);
    const enHtml = expanded.get(`${lang}:${c.name}`);
    const enForms = enHtml ? parseExpandedTable(enHtml, lang, gender) : null;
    let ref: string | undefined;

    let forms: NameForms;
    let declinable = true;
    let source: NameSource;
    if (override && override.gender === gender) {
      forms = override.forms ? toForms(override.forms) : indeclinable(c.name);
      declinable = override.forms !== null;
      source = "manual";
    } else if (seed) {
      forms = seed.forms;
      declinable = seed.declinable ?? true;
      source = "manual";
    } else if (wiki && wiki.gender === gender) {
      forms = wiki.forms;
      declinable = new Set(Object.values(forms)).size > 1;
      source = "wiktionary";
      ref = refs.get(c.name);
    } else if (enForms) {
      forms = enForms;
      declinable = new Set(Object.values(forms)).size > 1;
      source = "wiktionary";
      ref = `https://en.wiktionary.org/w/index.php?oldid=${en!.revid}`;
    } else {
      const guess = guessNameForms(c.name, gender, lang);
      forms = guess.forms;
      declinable = guess.declinable;
      source = "rules";
    }

    const baseName = c.baseName ?? (wiki && wiki.gender === gender ? wiki.baseName : null) ?? null;
    const dateFor = (dates: Map<string, string>) => dates.get(c.name) ?? (baseName ? dates.get(baseName) : undefined);
    const nameDays: DictionaryEntry["nameDays"] = {};
    const sk = dateFor(skDates);
    const cz = dateFor(czDates);
    if (sk) nameDays.sk = sk;
    if (cz) nameDays.cz = cz;

    entries.push({
      name: c.name,
      gender,
      forms: { N: forms.N, G: forms.G, D: forms.D, A: forms.A, V: forms.V, L: forms.L, I: forms.I },
      declinable,
      diminutives: diminutiveMap.get(`${c.name}|${gender}`) ?? [],
      baseName,
      nameDays,
      common: c.common,
      source,
      ...(ref ? { ref } : {}),
    });
  }

  const count = (prefix: string) => entries.filter((e) => e.ref?.startsWith(prefix)).length;
  sources.push(
    {
      name: `Wikislovník (${host})`,
      url: `https://${host}/`,
      license: "CC BY-SA 4.0",
      note: `Tvary, rod a domácke podoby z ${count(`https://${host}`)} hesiel; odkaz na revíziu v poli ref.`,
    },
    {
      name: "Wiktionary (en.wiktionary.org) – šablóny sk-ndecl / cs-ndecl",
      url: "https://en.wiktionary.org/",
      license: "CC BY-SA 4.0",
      note: `Tvary z ${count("https://en.wiktionary.org")} hesiel, ktoré domáci Wikislovník nemá; odkaz v poli ref.`,
    }
  );

  return entries.sort((a, b) => a.name.localeCompare(b.name, lang) || a.gender.localeCompare(b.gender));
}

async function main() {
  const [skPage, czPage] = await Promise.all([
    fetchPage(CALENDAR_PAGES.sk.host, CALENDAR_PAGES.sk.title),
    fetchPage(CALENDAR_PAGES.cz.host, CALENDAR_PAGES.cz.title),
  ]);
  const calendars = { sk: parseSkCalendar(skPage.wikitext), cz: parseCsCalendar(czPage.wikitext) };
  const calendarSources: DictionaryFile["sources"] = [
    {
      name: "Wikipédia – Meniny na Slovensku (podľa Oficiálneho kalendária MK SR)",
      url: `https://sk.wikipedia.org/w/index.php?oldid=${skPage.revid}`,
      license: "CC BY-SA 4.0",
      note: `Slovenský kalendár menín (trh sk): ${calendars.sk.length} priradení.`,
    },
    {
      name: "Wikipedie – Jmeniny v Česku (občanský kalendář)",
      url: `https://cs.wikipedia.org/w/index.php?oldid=${czPage.revid}`,
      license: "CC BY-SA 4.0",
      note: `Český kalendár menín (trh cz): ${calendars.cz.length} priradení.`,
    },
  ];

  for (const lang of ["sk", "cs"] as const) {
    const sources = [...calendarSources];
    const entries = await buildLanguage(lang, calendars, sources);
    sources.push({
      name: "Redakcia projektu (scripts/names/curated.ts)",
      url: "",
      license: "vlastné dielo",
      note: "Moderné mená novorodencov, domácke podoby, výnimky tvarov.",
    });
    const file: DictionaryFile = { language: lang, generatedAt: new Date().toISOString(), sources, entries };
    const out = path.join(DATA_DIR, `${lang}.json`);
    await writeFile(out, JSON.stringify(file, null, 1) + "\n");
    const bySource = entries.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.source]: (acc[e.source] ?? 0) + 1 }), {});
    console.log(`${lang}: ${entries.length} mien`, bySource);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
