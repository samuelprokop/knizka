/*
  Spoločné krivky a pružiny pohybu (jeden zdroj pravdy – podľa skillu
  remotion-motion-graphics: „one theme object“, žiadne lineárne krivky okrem
  nekonečných pásov, nástup meniaci 2 – 3 vlastnosti, odchod rýchlejší ako nástup,
  položky zoznamu nastupujú postupne).
*/

import type { Transition, Variants } from "motion/react";

export const EASE = {
  /** Nástupy – rýchly štart, dlhé dobehnutie (easeOutExpo). */
  out: [0.16, 1, 0.3, 1],
  /** Presuny a otáčanie (easeInOutQuint). */
  inOut: [0.65, 0, 0.35, 1],
  /** Len odchody. */
  in: [0.7, 0, 0.84, 0],
} as const satisfies Record<string, [number, number, number, number]>;

export const SPRING = {
  /** Drobné prvky rozhrania (čipy, výbery, bodky). */
  snappy: { type: "spring", stiffness: 420, damping: 34 },
  /** Väčšie plochy (karty, okná). */
  smooth: { type: "spring", stiffness: 180, damping: 24 },
  /** Hravé akcenty (košík, potvrdenia). */
  bouncy: { type: "spring", stiffness: 300, damping: 16 },
} as const satisfies Record<string, Transition>;

/** Trvanie odchodu – vždy kratšie ako nástup. */
export const EXIT = { duration: 0.16, ease: EASE.in } as const satisfies Transition;

/**
 * Postupný nástup zoznamu: rodič `variants={stagger.list}` + `initial="hidden" animate="show"`,
 * položky `variants={stagger.item}`. Nástup = priehľadnosť + posun + mierka.
 */
export const stagger = {
  list: { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE.out } },
  },
} as const satisfies Record<string, Variants>;
