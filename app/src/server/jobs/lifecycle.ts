import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { enqueue } from "./queue";
import type { LifecycleEmailKind } from "./types";

/*
  Naplánované e-maily pre návrat zákazníka (retencia). Každý druh sa pošle
  najviac raz na projekt (frekvenčný strop) a až v čase odoslania sa overí,
  či má ešte zmysel (kniha stále nedokončená, súhlas stále platí) – handler
  lifecycle-email.ts. Bez zliav a bez naliehavosti: pripomína sa len to, čo
  zákazník sám rozpracoval.

  Pravidlá zo špecifikácie: pripomenutie nedokončenej knihy len s marketingovým
  súhlasom (A3), žiadosť o recenziu až po doručení tlačenej knihy (A4).
*/

const HOUR = 3_600_000;

/** Kedy po udalosti príde e-mail. */
export const LIFECYCLE_DELAY_MS: Record<Exclude<LifecycleEmailKind, "review_request">, number> = {
  // Náhľad hotový, kniha neschválená: deň na rozmyslenie, potom jedna pripomienka.
  reminder_preview: 24 * HOUR,
  // Kniha v košíku, nezaplatená.
  reminder_cart: 24 * HOUR,
};

export async function scheduleLifecycleEmail(projectId: string, kind: LifecycleEmailKind, runAt: Date) {
  const [existing] = await db
    .select({ id: schema.jobs.id })
    .from(schema.jobs)
    .where(and(eq(schema.jobs.projectId, projectId), eq(schema.jobs.type, "lifecycle_email"), eq(schema.jobs.relatedType, kind)))
    .limit(1);
  if (existing) return null;
  return enqueue({ type: "lifecycle_email", projectId, payload: { kind }, relatedType: kind, runAt });
}

/** Posledné rozhodnutie zákazníka o marketingovom súhlase (odvolanie má prednosť pred starším súhlasom). */
export async function hasMarketingConsent(projectId: string) {
  const [latest] = await db
    .select({ granted: schema.consents.granted })
    .from(schema.consents)
    .where(and(eq(schema.consents.projectId, projectId), eq(schema.consents.type, "marketing")))
    .orderBy(desc(schema.consents.createdAt))
    .limit(1);
  return latest?.granted === true;
}
