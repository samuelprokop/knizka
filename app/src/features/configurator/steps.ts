/*
  Kroky konfigurátora (proces 03: Mapa procesu). Číslo kroku je to, čo sa
  ukladá do projects.currentStep; slug je časť URL /[market]/kniha/[id]/[slug].

  Krok 7 (generovanie) nie je v lište priebehu – lišta má 8 položiek
  (common.progress.*), generovanie je medzi vzhľadom a náhľadom.
*/

import type { MessageKey } from "@/i18n/messages";

export const STEPS = [
  { n: 1, slug: "dieta", progressKey: "common.progress.child" },
  { n: 2, slug: "fotka", progressKey: "common.progress.photo" },
  { n: 3, slug: "podoba", progressKey: "common.progress.style" },
  { n: 4, slug: "postavy", progressKey: "common.progress.characters" },
  { n: 5, slug: "pribeh", progressKey: "common.progress.story" },
  { n: 6, slug: "vzhlad", progressKey: "common.progress.layout" },
  { n: 7, slug: "generovanie", progressKey: null },
  { n: 8, slug: "nahlad", progressKey: "common.progress.preview" },
  { n: 9, slug: "schvalenie", progressKey: "common.progress.approve" },
] as const satisfies readonly { n: number; slug: string; progressKey: MessageKey | null }[];

export type Step = (typeof STEPS)[number];
export type StepNumber = Step["n"];
export type StepSlug = Step["slug"];

/** Kroky zobrazené v lište priebehu (bez generovania). */
export const PROGRESS_STEPS = STEPS.filter(
  (s): s is Extract<Step, { progressKey: MessageKey }> => s.progressKey !== null
);

export const stepBySlug = (slug: string): Step | undefined => STEPS.find((s) => s.slug === slug);
export const stepByNumber = (n: number): Step | undefined => STEPS.find((s) => s.n === n);

/** Poradie kroku v lište priebehu (1 – 8); generovanie patrí k náhľadu. */
export function progressIndex(n: StepNumber): number {
  const index = PROGRESS_STEPS.findIndex((s) => s.n >= n);
  return index === -1 ? PROGRESS_STEPS.length : index + 1;
}

export const stepHref = (market: string, projectId: string, n: StepNumber) =>
  `/${market}/kniha/${projectId}/${stepByNumber(n)!.slug}`;

/** Stav projektu, ktorý potrebuje krok – z neho vyplýva, kam až sa dá v lište skočiť. */
export type ProgressFacts = {
  hasHeroAppearance: boolean;
  heroApproved: boolean;
  storyChosen: boolean;
  bookGenerated: boolean;
  bookReady: boolean;
};

/**
 * Najvyšší krok, na ktorý zákazník smie ísť. Závislosti drží proces
 * (fotka/opis pred Kartou, Karta pred príbehom a generovaním, príbeh pred layoutom).
 */
export function maxReachableStep(f: ProgressFacts): StepNumber {
  if (f.bookReady) return 9;
  if (f.bookGenerated) return 7;
  if (f.storyChosen) return 6;
  if (f.heroApproved) return 5;
  if (f.hasHeroAppearance) return 3;
  return 2;
}
