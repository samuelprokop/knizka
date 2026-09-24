"use client";

/*
  Obsah úvodnej stránky – zvislé kroky vľavo podľa „Vertical Titles“ (21st.dev,
  Ark UI Steps), upravené na menu: položky sú zastávky knihy v hero + pätička,
  každá s nadpisom a kľúčovým popisom. Aktuálna je zvýraznená, prejdené sa
  NEodškrtávajú.

  Na desktope (od lg) je to trvalý stĺpec a hero si preň rezervuje miesto
  (--hero-inset na stránke, šírka stĺpca = TOC_WIDTH). Na mobile nie je – hero
  sa ovláda potiahnutím a stĺpec by zabral knihu. Pri pätičke sa vytratí.
*/

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

import type { LandingCopy } from "@/content/landing";
import { heroNavigation } from "./BookHero";
import { FooterRevealFadeOut } from "./FooterReveal";

type Item = { key: string; label: string; description: string; marker: ReactNode; target: number | "footer" };

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

/** Priestor, ktorý si hero rezervuje vľavo (okraj + stĺpec) – nastavuje sa na stránke. */
export const TOC_INSET_CLASS = "lg:[--hero-inset:17.5rem] xl:[--hero-inset:20rem]";

export function LandingToc({ copy }: { copy: LandingCopy }) {
  const reduceMotion = useReducedMotion();
  const current = useSyncExternalStore(heroNavigation.subscribe, heroNavigation.getCurrent, () => 0);

  const items: Item[] = [
    { key: "intro", label: copy.toc.intro, description: copy.toc.introShort, marker: <BookIcon />, target: 0 },
    ...copy.steps.map((step, i) => ({
      key: step.number,
      label: step.title,
      description: step.short,
      marker: String(i + 1),
      target: i + 1,
    })),
    { key: "outro", label: copy.toc.outro, description: copy.toc.outroShort, marker: <PenIcon />, target: heroNavigation.stops - 1 },
    { key: "footer", label: copy.toc.footer, description: copy.toc.footerShort, marker: <InfoIcon />, target: "footer" },
  ];

  const go = (target: Item["target"]) => {
    if (target === "footer") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      heroNavigation.goTo(target);
    }
  };

  return (
    <nav
      aria-label={copy.toc.label}
      className="fixed top-1/2 left-4 z-40 hidden w-60 -translate-y-1/2 lg:block xl:left-6 xl:w-72"
    >
      <FooterRevealFadeOut>
        <ol className="flex flex-col">
          {items.map((item, index) => {
            const active = item.target === current;
            const last = index === items.length - 1;
            return (
              <li key={item.key} className="relative">
                {/* Spojovacia čiara ku ďalšiemu kroku – bez „dokončeného“ stavu. */}
                {!last && <span aria-hidden className="absolute top-11 -bottom-1 left-[23px] w-0.5 rounded-full bg-ink/10" />}
                <button
                  type="button"
                  onClick={() => go(item.target)}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex w-full items-start gap-3 rounded-2xl p-2 text-left transition-colors outline-none hover:bg-ink/[0.03] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  <span className="relative flex size-8 shrink-0 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="landing-toc-current"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-brand-orange shadow-md shadow-brand-orange/30"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span
                      aria-hidden
                      className={cx(
                        "relative flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150",
                        active ? "text-ink" : "bg-white text-ink/70 ring-1 ring-ink/15 group-hover:text-ink group-hover:ring-ink/35"
                      )}
                    >
                      {item.marker}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col pt-0.5">
                    <span className={cx("text-sm leading-snug", active ? "font-semibold text-ink" : "font-medium text-ink/80 group-hover:text-ink")}>
                      {item.label}
                    </span>
                    <span className={cx("text-[13px] leading-snug", active ? "text-ink/70" : "text-ink/60")}>{item.description}</span>
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

// ---------------------------------------------------------------- ikony (SVG, nie emoji)

const iconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-4",
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
