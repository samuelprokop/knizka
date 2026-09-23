import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import type { Gender, NameForms } from "@/lib/language";
import { resolveName } from "@/lib/language/resolve";
import { capitalizeName, validateChildName } from "../validation";

export type NameLookup = {
  name: string;
  forms: NameForms;
  gender: Gender;
  declinable: boolean;
  /** Meno je v slovníku – inak tvary navrhli pravidlá a text to zákazníkovi povie. */
  known: boolean;
  /** Čipy „V knihe ho budeme volať“: základné meno a domácke podoby (J2). */
  variants: string[];
};

async function entry(name: string, language: BookLanguage) {
  const [row] = await db
    .select()
    .from(schema.nameDictionary)
    .where(and(eq(schema.nameDictionary.language, language), sql`lower(${schema.nameDictionary.name}) = lower(${name})`))
    .limit(1);
  return row ?? null;
}

/** Živá kontrola mena v kroku 1 a 4 – tvary, rod zo slovníka, domácke podoby. */
export async function lookupName(raw: string, language: BookLanguage, gender?: Gender): Promise<NameLookup | null> {
  if (validateChildName(raw)) return null;
  const name = capitalizeName(raw);
  const own = await entry(name, language);
  const resolved = await resolveName(name, language, gender ?? own?.gender);

  // Pri domáckej podobe (Janko) ponúkneme aj základné meno a jeho ďalšie podoby.
  const base = own?.baseName ? await entry(own.baseName, language) : own;
  const variants = base ? [base.name, ...base.diminutives] : [];
  if (variants.length && !variants.includes(resolved.name)) variants.unshift(resolved.name);

  return {
    name: resolved.name,
    forms: resolved.forms,
    gender: resolved.gender,
    declinable: resolved.declinable,
    known: resolved.source === "dictionary",
    variants: variants.length > 1 ? variants : [],
  };
}
