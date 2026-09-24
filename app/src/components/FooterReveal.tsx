"use client";

/*
  Pätička, ktorú obsah stránky pri dorolovaní „odkryje“: je prilepená pod
  obsahom (sticky, z-index -1) a ako sa odhaľuje, naberá priehľadnosť,
  veľkosť a ostrosť. Vlastná implementácia (motion), inšpirovaná vzorom
  „Footer reveal“ z motion.dev.

  Použitie:
    <FooterReveal>
      <FooterRevealContent>…stránka…</FooterRevealContent>
      <FooterRevealFooter>…pätička…</FooterRevealFooter>
    </FooterReveal>

  Pravidlá: FooterReveal ani nič nad ním nesmie mať overflow hidden (zruší
  sticky); obsah musí mať nepriehľadné pozadie, inak pätička presvitá.
  Pätička vyššia ako okno by sa nedala celá vidieť – vtedy sa zobrazí
  normálne v toku stránky, bez efektu.
*/

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Ctx = {
  progress: MotionValue<number>;
  /** Pätička sa zmestí do okna – inak je bez efektu v toku stránky. */
  fits: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  footerRef: React.RefObject<HTMLElement | null>;
};

const FooterRevealContext = createContext<Ctx | null>(null);

function useFooterReveal() {
  const ctx = useContext(FooterRevealContext);
  if (!ctx) throw new Error("FooterReveal* musí byť vnútri <FooterReveal>");
  return ctx;
}

/** Progres odkrytia pätičky 0 – 1 (0 = zakrytá, 1 = celá viditeľná). */
export const useFooterRevealProgress = () => useFooterReveal().progress;

export function FooterReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const progress = useMotionValue(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const { scrollY } = useScroll();
  const measured = useRef({ contentBottom: Infinity, footerHeight: 1 });
  const [fits, setFits] = useState(true);

  // Odkryté = o koľko je spodok obsahu nad spodkom okna, v pomere k výške pätičky.
  const update = useCallback(() => {
    const { contentBottom, footerHeight } = measured.current;
    const uncovered = scrollY.get() + window.innerHeight - contentBottom;
    progress.set(Math.min(1, Math.max(0, uncovered / footerHeight)));
  }, [progress, scrollY]);

  useEffect(() => {
    const content = contentRef.current;
    const footer = footerRef.current;
    if (!content || !footer) return;
    const measure = () => {
      measured.current = {
        contentBottom: content.getBoundingClientRect().bottom + window.scrollY,
        footerHeight: Math.max(1, footer.offsetHeight),
      };
      setFits(footer.offsetHeight <= window.innerHeight);
      update();
    };
    // ResizeObserver zavolá measure aj hneď po začatí sledovania.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    observer.observe(footer);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [update]);

  useMotionValueEvent(scrollY, "change", update);

  return (
    <FooterRevealContext.Provider value={{ progress, fits, contentRef, footerRef }}>
      {/* isolate: z-index -1 pätičky ostane v tomto kontexte (nad pozadím body, pod obsahom). */}
      <div className={`relative isolate ${className}`}>{children}</div>
    </FooterRevealContext.Provider>
  );
}

export function FooterRevealContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { contentRef } = useFooterReveal();
  return (
    <div ref={contentRef} className={`relative z-0 bg-white ${className}`}>
      {children}
    </div>
  );
}

export function FooterRevealFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { progress, fits, footerRef } = useFooterReveal();
  const reduceMotion = useReducedMotion();
  const animate = fits && !reduceMotion;
  const opacity = useTransform(progress, [0, 1], [0.35, 1]);
  const scale = useTransform(progress, [0, 1], [0.94, 1]);
  const filter = useTransform(progress, (p) => `blur(${((1 - p) * 8).toFixed(2)}px)`);

  return (
    <footer ref={footerRef} className={fits ? "sticky bottom-0 z-[-1] w-full" : "relative w-full"}>
      <motion.div
        style={animate ? { opacity, scale, filter } : undefined}
        className={`origin-bottom will-change-transform ${className}`}
      >
        {children}
      </motion.div>
    </footer>
  );
}

/**
 * Obsah, ktorý sa pri odkrývaní pätičky vytratí (napr. pevná hlavička – nech
 * neprekrýva pätičku, ktorá má vlastné tlačidlo).
 */
export function FooterRevealFadeOut({ children, className = "" }: { children: ReactNode; className?: string }) {
  const progress = useFooterRevealProgress();
  const opacity = useTransform(progress, [0, 0.5], [1, 0]);
  const pointerEvents = useTransform(progress, (p) => (p > 0.25 ? "none" : "auto"));
  return (
    <motion.div style={{ opacity, pointerEvents }} className={className}>
      {children}
    </motion.div>
  );
}
