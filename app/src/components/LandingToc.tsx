"use client";

/*
  Obsah úvodnej stránky – zvislé kroky vľavo (predloha „Vertical Titles“ z 21st.dev,
  Ark UI Steps), upravené na menu: položky sú zastávky knihy v hero + pätička.
  Aktuálna je zvýraznená, prejdené sa NEodškrtávajú.

  Aby nezavadzal textu hero, je zbalený na úzky pás koliesok; názvy sa ukážu po
  prejdení myšou alebo pri prechode klávesnicou (čítačka ich číta vždy). Len od
  šírky lg – na mobile sa hero ovláda potiahnutím a pás by zakrýval obsah.
  Pri odkrytí pätičky sa vytratí (nad oranžovou pätičkou by prekážal).
*/

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

import type { LandingCopy } from "@/content/landing";
import { heroNavigation } from "./BookHero";
import { FooterRevealFadeOut } from "./FooterReveal";

type Item = { key: string; label: string; marker: ReactNode; target: number | "footer" };

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

export function LandingToc({ copy }: { copy: LandingCopy }) {
  const reduceMotion = useReducedMotion();
  const current = useSyncExternalStore(heroNavigation.subscribe, heroNavigation.getCurrent, () => 0);

  const items: Item[] = [
    { key: "intro", label: copy.toc.intro, marker: <BookIcon />, target: 0 },
    ...copy.steps.map((step, i) => ({ key: step.number, label: step.title, marker: String(i + 1), target: i + 1 })),
    { key: "outro", label: copy.toc.outro, marker: <PenIcon />, target: heroNavigation.stops - 1 },
    { key: "footer", label: copy.toc.footer, marker: <InfoIcon />, target: "footer" },
  ];

  const go = (target: Item["target"]) => {
    if (target === "footer") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      heroNavigation.goTo(target);
    }
  };

  return (
    <nav aria-label={copy.toc.label} className="pointer-events-none fixed top-1/2 left-3 z-40 hidden -translate-y-1/2 lg:block xl:left-6">
      <FooterRevealFadeOut>
        <ol className="group/toc pointer-events-auto relative flex w-11 flex-col">
          {/* Panel s názvami – objaví sa pri prejdení myšou / zaostrení. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-y-3 -left-2 w-72 rounded-3xl bg-white/90 opacity-0 shadow-xl shadow-ink/10 ring-1 ring-ink/10 backdrop-blur-md transition-opacity duration-200 group-has-[:focus-visible]/toc:pointer-events-auto group-has-[:focus-visible]/toc:opacity-100 group-hover/toc:pointer-events-auto group-hover/toc:opacity-100"
          />
          {/* Spojovacia čiara medzi kolieskami – bez „dokončeného“ stavu. */}
          <span aria-hidden className="absolute top-[22px] bottom-[22px] left-[21px] w-0.5 rounded-full bg-ink/10" />

          {items.map((item) => {
            const active = item.target === current;
            return (
              <li key={item.key} className="relative">
                <button
                  type="button"
                  onClick={() => go(item.target)}
                  aria-current={active ? "step" : undefined}
                  className="group/item relative flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  {active && (
                    <motion.span
                      layoutId="landing-toc-current"
                      aria-hidden
                      className="absolute size-8 rounded-full bg-brand-orange shadow-md shadow-brand-orange/30"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    aria-hidden
                    className={cx(
                      "relative flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150",
                      active
                        ? "text-ink"
                        : "bg-white text-ink/70 ring-1 ring-ink/15 group-hover/item:text-ink group-hover/item:ring-ink/35"
                    )}
                  >
                    {item.marker}
                  </span>
                  {/* Názov – mimo toku, aby zbalený pás nezaberal miesto nad textom hero. */}
                  <span
                    className={cx(
                      "pointer-events-none absolute left-12 whitespace-nowrap text-sm opacity-0 transition duration-200 group-has-[:focus-visible]/toc:pointer-events-auto group-has-[:focus-visible]/toc:opacity-100 group-hover/toc:pointer-events-auto group-hover/toc:opacity-100 motion-safe:-translate-x-1 motion-safe:group-hover/toc:translate-x-0 motion-safe:group-has-[:focus-visible]/toc:translate-x-0",
                      active ? "font-semibold text-ink" : "font-medium text-ink/75 group-hover/item:text-ink"
                    )}
                  >
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
