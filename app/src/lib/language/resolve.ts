import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import { guessNameForms } from "./rules";
import type { Gender, ResolvedName } from "./types";

/**
 * Tvary mena pre knihu: najprv slovník (J1), inak návrh pravidlami (J4).
 * Mimo slovníka alebo s neovereným záznamom → projekt ide na jazykovú kontrolu.
 */
export async function resolveName(
  rawName: string,
  language: BookLanguage,
  gender?: Gender
): Promise<ResolvedName & { source: "dictionary" | "rules" }> {
  const name = rawName.trim();
  const [entry] = await db
    .select()
    .from(schema.nameDictionary)
    .where(
      and(
        eq(schema.nameDictionary.language, language),
        sql`lower(${schema.nameDictionary.name}) = lower(${name})`
      )
    )
    .limit(1);

  if (entry && (!gender || entry.gender === gender)) {
    return {
      name: entry.name,
      language,
      gender: entry.gender,
      forms: entry.forms as ResolvedName["forms"],
      declinable: entry.declinable,
      verified: entry.verified,
      diminutives: entry.diminutives,
      source: "dictionary",
    };
  }

  const resolvedGender = gender ?? entry?.gender ?? "girl";
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
