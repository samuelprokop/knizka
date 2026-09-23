/*
  Stavový automat projektu knihy (návrh procesu: Stavy projektu knihy).
  Každá zmena stavu ide cez assertTransition – nepovolený prechod je chyba,
  nie tichá zmena.
*/

import type { projectStatus } from "@/db/schema";

export type ProjectStatus = (typeof projectStatus.enumValues)[number];

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["hero_approved", "deleted"],
  hero_approved: ["text_approved", "draft", "deleted"],
  text_approved: ["generating", "hero_approved", "deleted"],
  generating: ["preview", "deleted"],
  // Úprava vyžadujúca generovanie vráti knihu do "generating"; zmena skoršieho
  // kroku (príbeh, štýl, meno) ju vráti pred generovanie (balík A).
  preview: ["generating", "text_approved", "approved_by_customer", "deleted"],
  // Pred platbou sa dá vrátiť k úpravám bez obmedzenia.
  approved_by_customer: ["paid", "preview"],
  paid: ["in_review"],
  in_review: ["fixing", "printing"],
  fixing: ["in_review", "awaiting_customer"],
  awaiting_customer: ["in_review"],
  printing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  deleted: [],
};

export const canTransition = (from: ProjectStatus, to: ProjectStatus) => TRANSITIONS[from].includes(to);

export function assertTransition(from: ProjectStatus, to: ProjectStatus) {
  if (!canTransition(from, to)) throw new Error(`Nepovolený prechod stavu projektu: ${from} → ${to}`);
}
