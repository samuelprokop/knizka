/* Formát dátových súborov slovníka app/data/names/{sk,cs}.json. */

import type { Gender, NameForms } from "../../src/lib/language/types";

/** Odkiaľ sú tvary: heslo Wikislovníka, ručná výnimka, alebo len návrh pravidlami (overiť prednostne). */
export type NameSource = "wiktionary" | "manual" | "rules";

export type DictionaryEntry = {
  name: string;
  gender: Gender;
  forms: NameForms;
  declinable: boolean;
  diminutives: string[];
  baseName: string | null;
  /** Meniny podľa TRHU (kód trhu → "MM-DD"), J8. */
  nameDays: { sk?: string; cz?: string };
  /** Tlačené v kalendári, moderné meno alebo domácka podoba bežného mena. */
  common: boolean;
  source: NameSource;
  /** Odkaz na revíziu hesla (pri source = wiktionary) – kvôli licencii a dohľadateľnosti. */
  ref?: string;
};

export type DictionaryFile = {
  language: "sk" | "cs";
  generatedAt: string;
  sources: { name: string; url: string; license: string; note: string }[];
  entries: DictionaryEntry[];
};
