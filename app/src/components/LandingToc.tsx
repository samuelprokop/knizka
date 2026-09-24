"use client";

/*
  Obsah úvodnej stránky – zvislé kroky vľavo podľa „Vertical Titles“ (21st.dev,
  Ark UI Steps), upravené na menu: položky sú zastávky knihy v hero + pätička,
  každá len s kľúčovým slovom. Aktuálna je zvýraznená, prejdené sa
  NEodškrtávajú.

  Na desktope (od lg) je to trvalý stĺpec a hero si preň rezervuje miesto
  (--hero-inset na stránke, šírka stĺpca = TOC_WIDTH). Na mobile nie je – hero
  sa ovláda potiahnutím a stĺpec by zabral knihu. Pri pätičke sa vytratí.
*/

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import type { LandingCopy } from "@/content/landing";
import { heroNavigation } from "./BookHero";
import { FooterRevealFadeOut } from "./FooterReveal";

type Item = { key: string; label: string; marker: ReactNode; target: number | "reviews" | "footer" };

/** id sekcie recenzií na stránke (ReviewsSection). */
const REVIEWS_ID = "recenzie";

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

/** Priestor, ktorý si hero rezervuje vľavo (okraj + stĺpec) – nastavuje sa na stránke. */
export const TOC_INSET_CLASS = "lg:[--hero-inset:10.5rem] xl:[--hero-inset:11.5rem]";

export function LandingToc({ copy, reviews = false }: { copy: LandingCopy; reviews?: boolean }) {
  const reduceMotion = useReducedMotion();
  const current = useSyncExternalStore(heroNavigation.subscribe, heroNavigation.getCurrent, () => 0);
  const inReviews = useSectionInView(reviews ? REVIEWS_ID : null);

  const items: Item[] = [
    { key: "intro", label: copy.toc.intro, marker: <BookIcon />, target: 0 },
    ...copy.steps.map((step, i) => ({
      key: step.number,
      label: step.toc,
      marker: String(i + 1),
      target: i + 1,
    })),
    { key: "outro", label: copy.toc.outro, marker: <PenIcon />, target: heroNavigation.stops - 1 },
    ...(reviews ? [{ key: "reviews", label: copy.toc.reviews, marker: <QuoteIcon />, target: "reviews" as const }] : []),
    { key: "footer", label: copy.toc.footer, marker: <InfoIcon />, target: "footer" },
  ];

  const go = (target: Item["target"]) => {
    if (target === "reviews") {
      document.getElementById(REVIEWS_ID)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    } else if (target === "footer") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      heroNavigation.goTo(target);
    }
  };

  return (
    <nav
      aria-label={copy.toc.label}
      className="fixed top-1/2 left-3 z-40 hidden w-36 -translate-y-1/2 lg:block xl:left-5"
    >
      <FooterRevealFadeOut>
        <ol className="flex flex-col">
          {items.map((item, index) => {
            const active = item.target === "reviews" ? inReviews : !inReviews && item.target === current;
            const last = index === items.length - 1;
            return (
              <li key={item.key} className="relative">
                {/* Spojovacia čiara ku ďalšiemu kroku – bez „dokončeného“ stavu. */}
                {!last && <span aria-hidden className="absolute top-[34px] -bottom-[6px] left-[19.5px] w-px bg-ink/15" />}
                <button
                  type="button"
                  onClick={() => go(item.target)}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex min-h-10 w-full items-center gap-2.5 rounded-full px-2 py-1 text-left transition-colors outline-none hover:bg-ink/[0.03] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  <span className="relative flex size-6 shrink-0 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="landing-toc-current"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-brand-orange shadow-sm shadow-brand-orange/30"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span
                      aria-hidden
                      className={cx(
                        "relative flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-150",
                        active ? "text-ink" : "bg-white text-ink/70 ring-1 ring-ink/15 group-hover:text-ink group-hover:ring-ink/35"
                      )}
                    >
                      {item.marker}
                    </span>
                  </span>
                  <span className={cx("truncate text-sm", active ? "font-semibold text-ink" : "font-medium text-ink/65 group-hover:text-ink")}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </FooterRevealFadeOut>
    </nav>
  );
}

/** Je sekcia s daným id v strede obrazovky? (null = sekcia na stránke nie je) */
function useSectionInView(id: string | null) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "-45% 0px -45% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);
  return inView;
}

// ---------------------------------------------------------------- ikony (SVG, nie emoji)

const iconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-3.5",
};

function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 4.2C6.8 3.3 5 3 2.5 3v9c2.5 0 4.3.3 5.5 1.2M8 4.2c1.2-.9 3-1.2 5.5-1.2v9c-2.5 0-4.3.3-5.5 1.2M8 4.2v9" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.5 2.8 13.2 5.5 6 12.7 2.8 13.2 3.3 10z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 7.3v3.6M8 5.1h.01" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6.5 4C4.6 4.9 3.5 6.5 3.5 8.6V12h3.5V8.5H5.3c.1-1.3.8-2.3 2-2.9L6.5 4zm6 0c-1.9.9-3 2.5-3 4.6V12H13V8.5h-1.7c.1-1.3.8-2.3 2-2.9L12.5 4z" />
    </svg>
  );
}
