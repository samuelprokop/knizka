"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useI18n } from "@/i18n/client";
import { cx } from "./ui";
import { useWizard } from "./WizardContext";
import { useSubStepBack } from "./WizardMotion";

/**
 * Spodná lišta pre jednoručné ovládanie: aktuálna cena s rozpisom
 * príplatkov (mení sa pri každej voľbe), Späť na predchádzajúci krok (od tabletu; na mobile je hore pri páse priebehu)
 * a hlavná akcia kroku. Krok s vlastným „Späť“ (podobrazovky) dá back={false}.
 */
export function StepFooter({ children, hidePrice, back = true }: { children?: ReactNode; hidePrice?: boolean; back?: boolean }) {
  const { t } = useI18n();
  const { price, prevHref } = useWizard();
  const subBack = useSubStepBack();
  const backHref = back && !subBack ? prevHref : null;
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t border-ink/10 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 md:flex md:items-center md:gap-6 md:py-3 lg:-mx-8 lg:px-8">
      {!hidePrice && (
        <div className="relative md:shrink-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="price-breakdown"
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-4 text-left text-sm text-ink/75 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 md:w-auto md:justify-start"
          >
            <span aria-live="polite">
              {t("common.price_bar", { price: "" })}
              <strong className="text-base text-ink">
                <AnimatedNumber value={price.total} />
              </strong>
            </span>
            <span className="underline underline-offset-4">{t("configurator.price.details")}</span>
          </button>
          <dl id="price-breakdown" hidden={!open} className="mb-2 flex flex-col gap-1 text-sm text-ink/80 md:absolute md:bottom-full md:left-0 md:mb-3 md:w-80 md:rounded-2xl md:bg-white md:p-4 md:shadow-xl md:ring-1 md:ring-ink/10">
            {price.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt>{line.label}</dt>
                <dd className="tabular-nums">{line.amount}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {(children || backHref || subBack) && (
        <div className={cx("flex items-start gap-2 md:flex-1 md:items-center md:justify-end", !hidePrice && "mt-2 md:mt-0")}>
          {subBack && (
            <button
              type="button"
              onClick={subBack}
              className="hidden min-h-12 min-w-12 shrink-0 items-center justify-center gap-1 rounded-full border-2 border-ink/15 bg-white px-3 pr-5 text-base font-semibold text-ink transition outline-none hover:border-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] motion-reduce:active:scale-100 md:flex"
            >
              <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
              {t("common.back")}
            </button>
          )}
          {backHref && (
            <Link
              href={backHref}
              aria-label={t("common.back")}
              className="hidden min-h-12 min-w-12 shrink-0 items-center justify-center gap-1 md:flex rounded-full border-2 border-ink/15 bg-white px-3 text-base font-semibold text-ink transition outline-none hover:border-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] motion-reduce:active:scale-100 pr-5"
            >
              <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
              <span aria-hidden>
                {t("common.back")}
              </span>
            </Link>
          )}
          {children && <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row-reverse sm:items-center">{children}</div>}
        </div>
      )}
    </div>
  );
}
