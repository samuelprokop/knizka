"use client";

/*
  Skeleton – zástupné „kosti“ s leskom, kým sa obsah načíta, a plynulé
  odovzdanie skutočnému obsahu. Vlastná implementácia (motion), inšpirovaná
  vzorom „Skeleton“ z motion.dev:

    <Skeleton className="h-4 w-32" />                   jedna kosť
    <SkeletonReveal loading={…} skeleton={…}>…</…>      jedna karta: zotretie zľava doprava
    <SkeletonResolveList loading={…}>                   zoznam: postupné prelínanie riadkov
      <SkeletonResolveRow index={i} content={…} skeleton={…} />
    </SkeletonResolveList>

  Lesk beží len keď je kosť na obrazovke a nie je zapnuté obmedzenie animácií.
  Farby: jemný oranžový nádych identity TAKTIK s bielym leskom.
  Všetko sú <span>, aby sa dali použiť aj v tlačidlách a odsekoch.
*/

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { createContext, useContext, useRef, useState, type CSSProperties, type ReactNode } from "react";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const EASE_OUT = EASE.out;
const EASE_IN_OUT = EASE.inOut;

// ---------------------------------------------------------------- kosť

export function Skeleton({
  animate = true,
  className,
  style,
  children,
}: {
  /** Lesk beží, keď je true; inak pokojná plocha. */
  animate?: boolean;
  /** Veľkosť a tvar kosti. */
  className?: string;
  style?: CSSProperties;
  /** Neviditeľne vykreslený obsah – kosť dostane jeho presné rozmery. */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: "120px" });
  const reduceMotion = useReducedMotion();
  const shimmering = animate && inView && !reduceMotion;

  return (
    <span
      ref={ref}
      aria-hidden
      className={cx("relative block overflow-hidden rounded-xl bg-brand-orange/10", className)}
      style={style}
    >
      {children && <span className="invisible">{children}</span>}
      {shimmering && (
        <motion.span
          className="absolute inset-y-0 -left-full w-full bg-linear-to-r from-transparent via-white/70 to-transparent"
          animate={{ x: ["0%", "200%"] }}
          transition={{ duration: 1.5, ease: EASE.inOut, repeat: Infinity, repeatDelay: 0.25 }}
        />
      )}
    </span>
  );
}

// ---------------------------------------------------------------- jedna karta

/**
 * Kosť a obsah ležia v tej istej bunke mriežky, takže sa rozloženie pri
 * odovzdaní nepohne. Obsah sa odhalí zotretím zľava doprava, kosť zmizne.
 * Ak bol obsah hotový už pri prvom vykreslení, zobrazí sa bez animácie.
 */
export function SkeletonReveal({
  loading,
  skeleton,
  children,
  className,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Animovať len prechod načítavanie → hotovo počas života komponentu.
  const [startedLoading] = useState(loading);
  const wipe = startedLoading && !reduceMotion;

  return (
    <span className={cx("grid", className)} aria-busy={loading || undefined}>
      <AnimatePresence initial={false}>
        {loading && (
          <motion.span
            key="skeleton"
            className="block [grid-area:1/1]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            {skeleton}
          </motion.span>
        )}
      </AnimatePresence>
      {!loading && (
        <motion.span
          key="content"
          className="block [grid-area:1/1]"
          initial={wipe ? { clipPath: "inset(0% 100% 0% 0%)" } : false}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 0.6, ease: EASE_IN_OUT }}
        >
          {children}
        </motion.span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- zoznam

type ResolveContext = { loading: boolean; stagger: number };

const ResolveCtx = createContext<ResolveContext | null>(null);

/** Spoločný stav načítania pre riadky; sám nevykresľuje žiadny prvok. */
export function SkeletonResolveList({
  loading,
  stagger = 0.06,
  children,
}: {
  loading: boolean;
  /** Oneskorenie medzi riadkami v sekundách. */
  stagger?: number;
  children: ReactNode;
}) {
  return <ResolveCtx.Provider value={{ loading, stagger }}>{children}</ResolveCtx.Provider>;
}

/**
 * Riadok bez posunu rozloženia: skutočný obsah je v toku stránky (počas
 * načítania neviditeľný), kosti ležia nad ním a postupne zmiznú.
 */
export function SkeletonResolveRow({
  index,
  content,
  skeleton,
  loading,
  stagger,
  className,
}: {
  index: number;
  content: ReactNode;
  skeleton: ReactNode;
  loading?: boolean;
  stagger?: number;
  className?: string;
}) {
  const ctx = useContext(ResolveCtx);
  const isLoading = loading ?? ctx?.loading ?? false;
  const step = stagger ?? ctx?.stagger ?? 0.06;
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: EASE_OUT, delay: isLoading ? 0 : index * step };

  return (
    <span className={cx("relative block", className)} aria-busy={isLoading || undefined}>
      <motion.span
        className="block"
        initial={false}
        animate={isLoading ? { opacity: 0, y: 4 } : { opacity: 1, y: 0 }}
        transition={transition}
      >
        {content}
      </motion.span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 block"
        initial={false}
        animate={{ opacity: isLoading ? 1 : 0 }}
        transition={transition}
      >
        {skeleton}
      </motion.span>
    </span>
  );
}
