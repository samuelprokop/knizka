import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import type { MarketCode } from "@/config/markets";
import type { BookLanguage } from "@/i18n/locales";
import { guessNameForms } from "./rules";
import { CASE_KEYS, type Gender, type NameForms, type ResolvedName } from "./types";

type DictionaryRow = typeof schema.nameDictionary.$inferSelect;

async function findEntries(name: string, language: BookLanguage, gender?: Gender): Promise<DictionaryRow[]> {
  return db
    .select()
    .from(schema.nameDictionary)
    .where(
      and(
        eq(schema.nameDictionary.language, language),
        sql`lower(${schema.nameDictionary.name}) = lower(${name})`,
        gender ? eq(schema.nameDictionary.gender, gender) : undefined
      )
    )
    .limit(2);
}

function fromEntry(entry: DictionaryRow, language: BookLanguage): ResolvedName & { source: "dictionary" } {
  return {
    name: entry.name,
    language,
    gender: entry.gender,
    forms: entry.forms as NameForms,
    declinable: entry.declinable,
    verified: entry.verified,
    diminutives: entry.diminutives,
    source: "dictionary",
  };
}

async function resolveSingle(
  name: string,
  language: BookLanguage,
  gender?: Gender
): Promise<ResolvedName & { source: "dictionary" | "rules" }> {
  const [entry] = await findEntries(name, language, gender);
  if (entry) return fromEntry(entry, language);

  const resolvedGender = gender ?? "girl";
  const guess = guessNameForms(name, resolvedGender, language);
  return {
    name,
    language,
    gender: resolvedGender,
    forms: guess.forms,
    declinable: guess.declinable,
    verified: false,
    diminutives: [],
    source: "rules",
  };
}

/**
 * Tvary mena pre knihu: najprv slovník (J1), inak návrh pravidlami (J4).
 * Mimo slovníka alebo s neovereným záznamom → projekt ide na jazykovú kontrolu
 * (needsNameReview + requestNameReview z ./review).
 *
 * Rovnaké meno môže byť v slovníku pre oba rody (Nikola, Saša) – bez `gender`
 * sa vráti prvý nájdený záznam.
 *
 * Dvojité meno („Anna Mária“, „Jean-Pierre“) sa skladá z častí; ak je niektorá
 * časť nesklonná, celé meno sa správa ako nesklonné (kniha použije záložné vety).
 */
export async function resolveName(
  rawName: string,
  language: BookLanguage,
  gender?: Gender
): Promise<ResolvedName & { source: "dictionary" | "rules" }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  const single = await resolveSingle(name, language, gender);
  const parts = name.split(/([ -])/);
  if (single.source === "dictionary" || parts.length === 1) return single;

  const resolvedGender = single.gender;
  const resolvedParts = await Promise.all(
    parts.filter((_, i) => i % 2 === 0).map((part) => resolveSingle(part, language, resolvedGender))
  );
  const separators = parts.filter((_, i) => i % 2 === 1);
  const declinable = resolvedParts.every((p) => p.declinable);
  const forms = Object.fromEntries(
    CASE_KEYS.map((key) => [
      key,
      resolvedParts.map((p, i) => (declinable ? p.forms[key] : p.forms.N) + (separators[i] ?? "")).join(""),
    ])
  ) as NameForms;

  return {
    name,
    language,
    gender: resolvedGender,
    forms,
    declinable,
    verified: resolvedParts.every((p) => p.verified),
    diminutives: [],
    source: resolvedParts.every((p) => p.source === "dictionary") ? "dictionary" : "rules",
  };
}

/** Meno ide na jazykovú kontrolu, ak nie je v slovníku, nie je overené, alebo ho zákazník opravil (K1.3). */
export function needsNameReview(
  resolved: ResolvedName & { source: "dictionary" | "rules" },
  customerForms?: Partial<NameForms>
): boolean {
  if (resolved.source !== "dictionary" || !resolved.verified) return true;
  if (!customerForms) return false;
  return CASE_KEYS.some((key) => customerForms[key] !== undefined && customerForms[key] !== resolved.forms[key]);
}

/**
 * Dátum menín pre TRH (J8) – kalendár je vlastnosť trhu, nie jazyka knihy:
 * Jana má na trhu sk meniny 21. 8., na trhu cz 24. 5.
 * Domácka podoba bez vlastného dátumu má dátum základného mena (doplnené pri importe).
 * Vracia "MM-DD" alebo null.
 */
export async function getNameDay(
  name: string,
  market: MarketCode,
  options: { language?: BookLanguage; gender?: Gender } = {}
): Promise<string | null> {
  const rows = await db
    .select({ nameDays: schema.nameDictionary.nameDays })
    .from(schema.nameDictionary)
    .where(
      and(
        sql`lower(${schema.nameDictionary.name}) = lower(${name.trim()})`,
        options.language ? eq(schema.nameDictionary.language, options.language) : undefined,
        options.gender ? eq(schema.nameDictionary.gender, options.gender) : undefined
      )
    );
  for (const row of rows) {
    const date = row.nameDays[market];
    if (date) return date;
  }
  return null;
}
