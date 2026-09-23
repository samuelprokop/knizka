import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type Gender, type NameForms } from "@/lib/language";

export type NameEntry = typeof schema.nameDictionary.$inferSelect;

const PAGE_SIZE = 50;

export type NameDictionaryFilter = { language?: BookLanguage; verified?: boolean; search?: string; page?: number };

export async function listNameDictionary(filter: NameDictionaryFilter = {}): Promise<{ entries: NameEntry[]; total: number }> {
  const page = Math.max(filter.page ?? 1, 1);
  const where = and(
    filter.language ? eq(schema.nameDictionary.language, filter.language) : undefined,
    filter.verified !== undefined ? eq(schema.nameDictionary.verified, filter.verified) : undefined,
    filter.search ? or(ilike(schema.nameDictionary.name, `%${filter.search}%`), ilike(schema.nameDictionary.baseName, `%${filter.search}%`)) : undefined
  );

  const [entries, totalRows] = await Promise.all([
    db
      .select()
      .from(schema.nameDictionary)
      .where(where)
      .orderBy(asc(schema.nameDictionary.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ id: schema.nameDictionary.id }).from(schema.nameDictionary).where(where),
  ]);
  return { entries, total: totalRows.length };
}

export async function getNameEntry(id: string): Promise<NameEntry | null> {
  const [entry] = await db.select().from(schema.nameDictionary).where(eq(schema.nameDictionary.id, id)).limit(1);
  return entry ?? null;
}

/** Vytvorí nový záznam alebo upraví existujúci (J10: „pridávanie mien“, úprava tvarov). */
export async function upsertNameEntry(input: {
  language: BookLanguage;
  name: string;
  gender: Gender;
  forms: NameForms;
  declinable: boolean;
  diminutives: string[];
  baseName?: string | null;
}): Promise<NameEntry> {
  const values = {
    language: input.language,
    name: input.name.trim(),
    gender: input.gender,
    forms: input.forms,
    declinable: input.declinable,
    diminutives: input.diminutives.map((d) => d.trim()).filter(Boolean),
    baseName: input.baseName?.trim() || null,
    source: "manual",
    verified: true,
  };
  const [entry] = await db
    .insert(schema.nameDictionary)
    .values(values)
    .onConflictDoUpdate({ target: [schema.nameDictionary.language, schema.nameDictionary.name, schema.nameDictionary.gender], set: values })
    .returning();
  return entry;
}

export function emptyForms(): NameForms {
  return Object.fromEntries(CASE_KEYS.map((key) => [key, ""])) as NameForms;
}

export { CASE_KEYS };
export { approveNameReview, hasOpenNameReview, listNameReviews, rejectNameReview } from "@/lib/language/review";

export async function getNameReviewTask(id: string) {
  const [task] = await db.select().from(schema.nameReviewTasks).where(eq(schema.nameReviewTasks.id, id)).limit(1);
  return task ?? null;
}
