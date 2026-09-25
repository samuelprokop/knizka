"use client";

import { useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useSectionStep } from "./useSectionStep";

/**
 * Sekcia úvodnej stránky, ktorá sa správa ako ďalší krok (rovnako ako recenzie):
 * gesto nadol ju „zastaví“ na jej začiatku, nahor sa vráti na predchádzajúcu sekciu
 * (previousId) – alebo na koniec knihy, ak predchádzajúca na stránke nie je.
 */
export function StepSection({
  id,
  previousId,
  className,
  labelledBy,
  children,
}: {
  id: string;
  previousId?: string;
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useSectionStep(ref, !!reduce, () => {
    const previous = previousId ? document.getElementById(previousId) : null;
    if (previous) return previous.getBoundingClientRect().top + window.scrollY;
    return (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY - window.innerHeight;
  });
  return (
    <section ref={ref} id={id} aria-labelledby={labelledBy} className={className}>
      {children}
    </section>
  );
}
