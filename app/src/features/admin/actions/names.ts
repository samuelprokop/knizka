"use server";

import { revalidatePath } from "next/cache";

import { db, schema } from "@/db";
import { isBookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type Gender, type NameForms } from "@/lib/language";
import { approveNameReview, rejectNameReview, upsertNameEntry } from "../server/names";
import { adminAction, type ActionResult } from "./common";

function parseForms(raw: unknown): NameForms {
  const source = (raw ?? {}) as Record<string, unknown>;
  const forms = {} as NameForms;
  for (const key of CASE_KEYS) {
    const value = source[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`Chýba tvar „${key}“.`);
    forms[key] = value.trim();
  }
  return forms;
}

export async function saveNameEntryAction(input: {
  language: string;
  name: string;
  gender: Gender;
  forms: unknown;
  declinable: boolean;
  diminutives: string;
  baseName?: string;
}): Promise<ActionResult> {
  return adminAction("slovnik", async (admin) => {
    if (!isBookLanguage(input.language)) throw new Error("Neznámy jazyk.");
    if (!input.name.trim()) throw new Error("Meno je povinné.");
    const forms = parseForms(input.forms);
    const entry = await upsertNameEntry({
      language: input.language,
      name: input.name,
      gender: input.gender,
      forms,
      declinable: input.declinable,
      diminutives: input.diminutives.split(",").map((d) => d.trim()).filter(Boolean),
      baseName: input.baseName,
    });
    await db.insert(schema.auditLog).values({ actor: admin.email, action: "name_dictionary.save", subjectType: "name_dictionary", subjectId: entry.id });
    revalidatePath("/admin/slovnik");
  });
}

export async function approveNameReviewAction(taskId: string, forms: unknown, declinable: boolean, note?: string): Promise<ActionResult> {
  return adminAction("slovnik", async (admin) => {
    await approveNameReview(taskId, { reviewer: admin.email, forms: parseForms(forms), declinable, note });
    revalidatePath("/admin/slovnik/fronta");
  });
}

export async function rejectNameReviewAction(taskId: string, note: string): Promise<ActionResult> {
  return adminAction("slovnik", async (admin) => {
    if (!note.trim()) throw new Error("Zamietnutie potrebuje poznámku pre zákazníka.");
    await rejectNameReview(taskId, { reviewer: admin.email, note: note.trim() });
    revalidatePath("/admin/slovnik/fronta");
  });
}
