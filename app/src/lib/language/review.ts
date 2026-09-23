import "server-only";

/*
  Fronta jazykovej kontroly (J4, K1.3, akceptácia: „Meno mimo slovníka vytvorí úlohu
  jazykovej kontroly a kniha nejde do tlače pred jej vybavením“).

  Tok:
    konfigurátor (A)  → resolveName() → needsNameReview() → requestNameReview()
    administrácia (E) → listNameReviews() → approveNameReview() / rejectNameReview()
    výroba (D)        → hasOpenNameReview(projectId) blokuje tlač

  Súkromie: meno dieťaťa je v úlohe len kvôli korektúre; úloha sa zmaže spolu
  s projektom (ON DELETE CASCADE) a do auditu ide len id úlohy, nie meno.
*/

import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type Gender, type NameForms } from "./types";

type Task = typeof schema.nameReviewTasks.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const OPEN_STATUSES = ["pending", "rejected"] as const;

const sameForms = (a: Record<string, string> | null | undefined, b: Record<string, string> | null | undefined) =>
  Boolean(a && b) && CASE_KEYS.every((key) => a![key] === b![key]);

/**
 * Vytvorí (alebo nahradí) úlohu jazykovej kontroly pre meno postavy a označí projekt.
 * Opakované volanie pre tú istú postavu nahradí jej staršie nevybavené úlohy.
 */
export async function requestNameReview(input: {
  projectId: string;
  characterId?: string;
  language: BookLanguage;
  name: string;
  gender: Gender;
  proposedForms: NameForms;
  customerForms?: NameForms;
  declinable: boolean;
}): Promise<Task> {
  return db.transaction(async (tx) => {
    if (input.characterId) {
      await tx
        .delete(schema.nameReviewTasks)
        .where(
          and(
            eq(schema.nameReviewTasks.characterId, input.characterId),
            inArray(schema.nameReviewTasks.status, [...OPEN_STATUSES])
          )
        );
    }
    const [task] = await tx
      .insert(schema.nameReviewTasks)
      .values({
        projectId: input.projectId,
        characterId: input.characterId ?? null,
        language: input.language,
        name: input.name.trim(),
        gender: input.gender,
        proposedForms: input.proposedForms,
        customerForms: input.customerForms ?? null,
        declinable: input.declinable,
      })
      .returning();
    await tx
      .update(schema.projects)
      .set({ needsLanguageReview: true })
      .where(eq(schema.projects.id, input.projectId));
    return task;
  });
}

export async function listNameReviews(
  filter: { status?: Task["status"]; language?: BookLanguage; limit?: number } = {}
): Promise<Task[]> {
  return db
    .select()
    .from(schema.nameReviewTasks)
    .where(
      and(
        eq(schema.nameReviewTasks.status, filter.status ?? "pending"),
        filter.language ? eq(schema.nameReviewTasks.language, filter.language) : undefined
      )
    )
    .orderBy(desc(schema.nameReviewTasks.createdAt))
    .limit(filter.limit ?? 100);
}

/** Tlač projektu je zablokovaná, kým má nevybavenú (alebo zamietnutú) úlohu. */
export async function hasOpenNameReview(projectId: string): Promise<boolean> {
  const [open] = await db
    .select({ id: schema.nameReviewTasks.id })
    .from(schema.nameReviewTasks)
    .where(
      and(
        eq(schema.nameReviewTasks.projectId, projectId),
        inArray(schema.nameReviewTasks.status, [...OPEN_STATUSES])
      )
    )
    .limit(1);
  return Boolean(open);
}

async function refreshProjectFlags(tx: Tx, projectIds: (string | null)[]) {
  for (const projectId of new Set(projectIds.filter((id): id is string => Boolean(id)))) {
    const [open] = await tx
      .select({ id: schema.nameReviewTasks.id })
      .from(schema.nameReviewTasks)
      .where(
        and(
          eq(schema.nameReviewTasks.projectId, projectId),
          inArray(schema.nameReviewTasks.status, [...OPEN_STATUSES])
        )
      )
      .limit(1);
    await tx.update(schema.projects).set({ needsLanguageReview: Boolean(open) }).where(eq(schema.projects.id, projectId));
  }
}

/**
 * Korektor schváli tvary (prípadne opravené). Meno sa zapíše do slovníka ako overené,
 * tvary sa prenesú k postave a úlohy iných projektov s rovnakým menom a rovnakými
 * tvarmi sa vybavia s ním (úlohy s inak opravenými tvarmi ostávajú na posúdenie).
 */
export async function approveNameReview(
  taskId: string,
  decision: { reviewer: string; forms?: NameForms; declinable?: boolean; note?: string }
): Promise<{ resolvedTaskIds: string[] }> {
  return db.transaction(async (tx) => {
    const [task] = await tx.select().from(schema.nameReviewTasks).where(eq(schema.nameReviewTasks.id, taskId)).limit(1);
    if (!task) throw new Error("Úloha jazykovej kontroly neexistuje.");
    if (task.status === "approved") return { resolvedTaskIds: [] };

    const forms = (decision.forms ?? task.customerForms ?? task.proposedForms) as NameForms;
    const declinable = decision.declinable ?? task.declinable;
    const now = new Date();

    const siblings = await tx
      .select()
      .from(schema.nameReviewTasks)
      .where(
        and(
          eq(schema.nameReviewTasks.language, task.language),
          eq(schema.nameReviewTasks.name, task.name),
          eq(schema.nameReviewTasks.gender, task.gender),
          eq(schema.nameReviewTasks.status, "pending"),
          ne(schema.nameReviewTasks.id, task.id)
        )
      );
    const resolved = [task, ...siblings.filter((s) => sameForms(s.customerForms ?? s.proposedForms, forms))];
    const resolvedIds = resolved.map((t) => t.id);

    await tx
      .update(schema.nameReviewTasks)
      .set({
        status: "approved",
        approvedForms: forms,
        approvedDeclinable: declinable,
        reviewer: decision.reviewer,
        note: decision.note ?? null,
        resolvedAt: now,
      })
      .where(inArray(schema.nameReviewTasks.id, resolvedIds));

    const entry = {
      language: task.language,
      name: task.name,
      gender: task.gender,
      forms,
      declinable,
      source: "review",
      verified: true,
    };
    await tx
      .insert(schema.nameDictionary)
      .values(entry)
      .onConflictDoUpdate({
        target: [schema.nameDictionary.language, schema.nameDictionary.name, schema.nameDictionary.gender],
        set: entry,
      });

    const characterIds = resolved.map((t) => t.characterId).filter((id): id is string => Boolean(id));
    if (characterIds.length) {
      await tx
        .update(schema.characters)
        .set({ nameForms: forms, nameIndeclinable: !declinable })
        .where(inArray(schema.characters.id, characterIds));
    }
    await refreshProjectFlags(tx, resolved.map((t) => t.projectId));

    await tx.insert(schema.auditLog).values(
      resolved.map((t) => ({
        actor: decision.reviewer,
        action: "name_review.approve",
        subjectType: "name_review_task",
        subjectId: t.id,
      }))
    );
    return { resolvedTaskIds: resolvedIds };
  });
}

/**
 * Zamietnutie (meno je nevhodné alebo nejednoznačné). Projekt ostáva blokovaný,
 * kým zákazník meno nezmení – nová požiadavka pre postavu zamietnutú úlohu nahradí.
 */
export async function rejectNameReview(taskId: string, decision: { reviewer: string; note: string }): Promise<void> {
  await db.transaction(async (tx) => {
    const [task] = await tx
      .update(schema.nameReviewTasks)
      .set({ status: "rejected", reviewer: decision.reviewer, note: decision.note, resolvedAt: new Date() })
      .where(and(eq(schema.nameReviewTasks.id, taskId), eq(schema.nameReviewTasks.status, "pending")))
      .returning();
    if (!task) throw new Error("Úloha neexistuje alebo už bola vybavená.");
    await refreshProjectFlags(tx, [task.projectId]);
    await tx.insert(schema.auditLog).values({
      actor: decision.reviewer,
      action: "name_review.reject",
      subjectType: "name_review_task",
      subjectId: task.id,
      // Poznámka korektora môže obsahovať meno dieťaťa – do auditu nejde (A2).
    });
  });
}
