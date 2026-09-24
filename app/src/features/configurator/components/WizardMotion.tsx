"use client";

/*
  Pohyb konfigurátora podľa „Multistep Form“ (Spectrum UI, 21st.dev):
  lišta priebehu s bodkami a názvami krokov nad vypĺňajúcim sa pásom
  a obsah kroku, ktorý pri prechode vojde zboku (smer podľa toho, či
  zákazník ide dopredu alebo späť).

  Každý krok je vlastná stránka, takže sa komponenty pri prechode vytvoria
  nanovo. Predchádzajúci krok si preto pamätáme v module (prežije klientskú
  navigáciu): pás dobehne z minulej pozície a obsah vojde zo správnej strany.
  Pri prvom načítaní sa nič neanimuje.
*/

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { ChevronLeftIcon } from "@/components/icons";
import { cx } from "./ui";

export type ProgressItem = { key: string; label: string; href: string | null; ariaLabel: string };

let lastIndex: number | null = null;

/*
  Podstránka kroku (napr. „Nová postava“, „Upraviť podobu“): krok namiesto
  predĺženia stránky zobrazí podstránku a jej názov sa ukáže v hornej lište
  pri aktuálnom kroku. Krok ju ohlási cez useSubStep(názov | null).
*/
let subLabel: string | null = null;
let subBack: (() => void) | null = null;
const subListeners = new Set<() => void>();
const subscribeSub = (listener: () => void) => {
  subListeners.add(listener);
  return () => {
    subListeners.delete(listener);
  };
};
/** onBack: tlačidlo Späť v spodnej lište vráti z podstránky na hlavnú obrazovku kroku. */
export function useSubStep(label: string | null, onBack?: () => void) {
  // Posledná verzia spätnej funkcie (môže závisieť od stavu, napr. číslo otázky).
  const backRef = useRef(onBack);
  useEffect(() => {
    backRef.current = onBack;
  });
  useEffect(() => {
    subLabel = label;
    subBack = label && backRef.current ? () => backRef.current?.() : null;
    subListeners.forEach((l) => l());
    return () => {
      subLabel = null;
      subBack = null;
      subListeners.forEach((l) => l());
    };
  }, [label]);
}
/** Spätná akcia aktuálnej podstránky (null = žiadna podstránka). */
export const useSubStepBack = () => useSyncExternalStore(subscribeSub, () => subBack, () => null);
const useSubStepLabel = () => useSyncExternalStore(subscribeSub, () => subLabel, () => null);

/** Pre text „Krok 4 z 8: Postavy“ na mobile – doplní „ › Nová postava“. */
export function SubStepSuffix() {
  const sub = useSubStepLabel();
  return sub ? <> › {sub}</> : null;
}

/** Index kroku, z ktorého zákazník prišiel (null pri prvom načítaní). Číta sa raz pri vytvorení. */
function usePreviousIndex() {
  const [previous] = useState(() => lastIndex);
  return previous;
}

export function WizardProgress({
  items: stepItems,
  current: stepCurrent,
  label,
  back,
  backLabel,
}: {
  items: ProgressItem[];
  current: number;
  label: string;
  /** Mobil: šípka späť vľavo od pásu (null = prvý krok). */
  back: { href: string; label: string } | null;
  backLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const previous = usePreviousIndex();
  const sub = useSubStepLabel();
  const subBackAction = useSubStepBack();
  // Podstránka je v lište ďalší krok hneď za aktuálnym (aktuálny sa zobrazí ako hotový).
  const items: ProgressItem[] = sub
    ? [...stepItems.slice(0, stepCurrent + 1), { key: "sub", label: sub, href: null, ariaLabel: sub }, ...stepItems.slice(stepCurrent + 1)]
    : stepItems;
  const current = sub ? stepCurrent + 1 : stepCurrent;
  const ratio = (i: number) => (items.length > 1 ? i / (items.length - 1) : 1);

  return (
    <nav aria-label={label}>
      {/* Mobil (podľa „Onboarding“): späť + pás z úsekov; aktuálny úsek sa pri kroku dopredu vyplní. */}
      <div className="flex min-h-11 items-center gap-2 md:hidden">
        {/* Na podstránke vedie späť na hlavnú obrazovku kroku, inak na predchádzajúci krok. */}
        {subBackAction ? (
          <button
            type="button"
            onClick={subBackAction}
            aria-label={backLabel}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <ChevronLeftIcon className="size-6" />
          </button>
        ) : back ? (
          <Link
            href={back.href}
            aria-label={back.label}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <ChevronLeftIcon className="size-6" />
          </Link>
        ) : null}
        <ol className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item, i) => (
            <li key={item.key} aria-current={i === current ? "step" : undefined} className="relative h-1.5 overflow-hidden rounded-full bg-ink/10">
              {i <= current && (
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-brand-orange"
                  initial={{ scaleX: i === current && previous !== null && previous < current ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                />
              )}
              <span className="sr-only">{item.ariaLabel}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative hidden md:block">
      {/* Pás priebehu – ide stredom bodiek. */}
      <div aria-hidden className="absolute inset-x-[calc(100%/var(--n)/2)] top-5 h-1 rounded-full bg-ink/10" style={{ "--n": items.length } as CSSProperties}>
        <motion.div
          className="h-full rounded-full bg-brand-orange"
          initial={{ width: `${ratio(previous ?? current) * 100}%` }}
          animate={{ width: `${ratio(current) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const content = (
            <>
              <span className="flex size-11 items-center justify-center">
                <span
                  className={cx(
                    "block rounded-full transition-all duration-300 motion-reduce:transition-none",
                    state === "done" && "size-3.5 bg-brand-orange",
                    state === "current" && "size-4 bg-brand-orange ring-4 ring-brand-orange/25",
                    state === "todo" && "size-3.5 bg-white ring-2 ring-ink/15",
                    item.href && "group-hover:scale-125"
                  )}
                />
              </span>
              <span
                className={cx(
                  "-mt-1.5 block px-0.5 text-center text-xs leading-tight",
                  state === "current" ? "font-semibold text-ink" : "text-ink/60",
                  item.href && "group-hover:text-ink"
                )}
              >
                {item.label}
              </span>
            </>
          );
          return (
            <li key={item.key} className="flex justify-center">
              {item.href ? (
                <Link
                  href={item.href}
                  aria-label={item.ariaLabel}
                  className="group flex flex-col items-center rounded-2xl pb-1 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  {content}
                </Link>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined} className="flex flex-col items-center pb-1">
                  {content}
                  <span className="sr-only">{item.ariaLabel}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      </div>
    </nav>
  );
}

/** Obsah kroku – pri prechode z iného kroku vojde zboku podľa smeru. */
export function StepTransition({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const previous = usePreviousIndex();
  const direction = previous === null || previous === index ? 0 : index > previous ? 1 : -1;

  // Zapamätať až po vykreslení – lišta aj obsah čítajú rovnakú minulú hodnotu.
  useEffect(() => {
    lastIndex = index;
  }, [index]);

  return (
    <motion.div
      className={className}
      initial={direction === 0 || reduceMotion ? false : { opacity: 0, x: direction * 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
