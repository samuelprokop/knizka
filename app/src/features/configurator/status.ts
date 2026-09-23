/*
  Návrat stavu projektu pri zmene skoršieho kroku. Ide krok po kroku cez
  povolené prechody automatu (assertTransition), nikdy priamym skokom.
*/

import { assertTransition, type ProjectStatus } from "@/domain/project-status";

/** Cesta späť v tvorbe knihy: z ktorého stavu do ktorého sa vracia. */
const BACK: Partial<Record<ProjectStatus, ProjectStatus>> = {
  approved_by_customer: "preview",
  preview: "text_approved",
  text_approved: "hero_approved",
  hero_approved: "draft",
};

const ORDER: ProjectStatus[] = ["draft", "hero_approved", "text_approved", "generating", "preview", "approved_by_customer"];

export class ProjectLockedError extends Error {
  constructor(status: ProjectStatus) {
    super(`Projekt v stave ${status} sa nedá meniť`);
  }
}

/**
 * Vráti stav najviac na `target`. Ak je projekt už nižšie, nič nemení.
 * Počas generovania a po platbe sa skoršie kroky meniť nedajú.
 */
export function rewindStatus(current: ProjectStatus, target: ProjectStatus): ProjectStatus {
  if (!ORDER.includes(current) || current === "generating") throw new ProjectLockedError(current);
  let status: ProjectStatus = current;
  while (ORDER.indexOf(status) > ORDER.indexOf(target)) {
    const previous: ProjectStatus | undefined = BACK[status];
    if (!previous) throw new ProjectLockedError(current);
    assertTransition(status, previous);
    status = previous;
  }
  return status;
}

/** Posun vpred o jeden krok automatu (napr. schválenie Karty). */
export function advanceStatus(current: ProjectStatus, next: ProjectStatus): ProjectStatus {
  assertTransition(current, next);
  return next;
}

/** Či zmena skoršieho kroku znamená nové vytvorenie časti knihy (common.change_earlier_step). */
export const changeRegeneratesBook = (status: ProjectStatus) =>
  status === "preview" || status === "approved_by_customer";
