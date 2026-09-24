"use client";

/*
  Animované číslo – vlastná implementácia podľa príkladu „Price switcher“
  (motion.dev, AnimateNumber z Motion+): pri zmene sa každá cifra pretočí
  na novú ako počítadlo, pribudnuté cifry sa objavia, ubudnuté zmiznú
  a okolitý text sa plynulo posunie.

    <AnimatedNumber value={formatMoney(total, market)} prefix="Celkom: " />

  Berie už naformátovaný text (mena, oddeľovače podľa trhu) – cifry sa
  zarovnávajú sprava, takže mena a desatinná časť zostanú na mieste.
  Pri prvom vykreslení a pri obmedzení animácií sa nič nehýbe. Čítačka
  obrazovky dostane celý text naraz.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

export function AnimatedNumber({
  value,
  prefix,
  suffix,
  className,
}: {
  /** Naformátované číslo, napr. „35,85 €“. */
  value: string;
  /** Text pred číslom – posúva sa spolu s ním. */
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const chars = [...value];

  if (reduceMotion) {
    return (
      <span className={cx("tabular-nums", className)}>
        {prefix}
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span className={cx("relative inline-flex items-baseline whitespace-pre tabular-nums", className)}>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
      {prefix && (
        <motion.span aria-hidden layout="position" transition={SPRING} className="inline-block">
          {prefix}
        </motion.span>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map((char, i) => {
          // Kľúč podľa pozície sprava: rovnaké miesto = rovnaký stĺpec cifier.
          const fromRight = chars.length - 1 - i;
          const isDigit = char >= "0" && char <= "9";
          return (
            <motion.span
              key={isDigit ? `d${fromRight}` : `c${fromRight}${char}`}
              aria-hidden
              layout="position"
              initial={{ opacity: 0, y: "-0.35em", filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: "0.35em", filter: "blur(2px)", transition: { duration: 0.15 } }}
              transition={SPRING}
              className="inline-block"
            >
              {isDigit ? <DigitColumn digit={Number(char)} /> : char}
            </motion.span>
          );
        })}
      </AnimatePresence>
      {suffix && (
        <motion.span aria-hidden layout="position" transition={SPRING} className="inline-block">
          {suffix}
        </motion.span>
      )}
    </span>
  );
}

/**
 * Stĺpec cifier 0–9 posunutý na aktuálnu cifru. Viditeľný je jeden riadok;
 * nad a pod ním je pás, ktorý sa stráca do priehľadna (mäkké okraje pri pretáčaní).
 */
function DigitColumn({ digit }: { digit: number }) {
  return (
    <span className="relative -my-[0.2em] inline-block overflow-clip py-[0.2em] [mask-image:linear-gradient(to_bottom,transparent,black_0.2em,black_calc(100%-0.2em),transparent)]">
      {/* Neviditeľná cifra drží šírku a výšku riadku. */}
      <span className="invisible">{digit}</span>
      <motion.span
        className="absolute inset-x-0 top-[0.2em] flex flex-col items-center select-none"
        initial={false}
        animate={{ y: `${-digit * 10}%` }}
        transition={SPRING}
      >
        {DIGITS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </motion.span>
    </span>
  );
}
