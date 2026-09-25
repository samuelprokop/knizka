"use client";

/*
  Rozbaľovacie otázky podľa „Centered Accordion FAQ“ (21st.dev, ln-dev7, MIT):
  riadky oddelené čiarou, šípka sa pootočí, odpoveď sa plynulo rozvinie.
  Prístupnosť (WAI-ARIA Accordion): tlačidlo s aria-expanded a aria-controls,
  odpoveď je region s aria-labelledby. Každá otázka má kotvu (#id) – odkazy
  z pätičky otvoria priamo tú otázku.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import type { FaqItem } from "@/content/faq";
import { EASE } from "@/lib/motion";
import { ChevronDownIcon } from "./icons";

export function FaqAccordion({ items, idPrefix = "" }: { items: FaqItem[]; idPrefix?: string }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);

  // Kotva v adrese (#otazka) otvorí danú otázku – aj pri neskoršej zmene kotvy.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (items.some((i) => idPrefix + i.id === id)) setOpen(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [items, idPrefix]);

  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item) => {
        const id = idPrefix + item.id;
        const expanded = open === id;
        return (
          <li key={id} id={id} className="scroll-mt-28">
            <h3>
              <button
                type="button"
                id={`${id}-q`}
                aria-expanded={expanded}
                aria-controls={`${id}-a`}
                onClick={() => setOpen(expanded ? null : id)}
                className="group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 sm:text-lg"
              >
                <span className="transition-colors group-hover:text-brand-orange-dark">{item.q}</span>
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,rotate] duration-300 motion-reduce:transition-none ${
                    expanded ? "rotate-180 bg-brand-orange/15 text-brand-orange-dark" : "bg-ink/5 text-ink/60"
                  }`}
                >
                  <ChevronDownIcon className="size-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`${id}-a`}
                  role="region"
                  aria-labelledby={`${id}-q`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: { duration: reduce ? 0 : 0.35, ease: EASE.out } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: reduce ? 0 : 0.2, ease: EASE.in } }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-5 text-base leading-relaxed text-ink/75">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
