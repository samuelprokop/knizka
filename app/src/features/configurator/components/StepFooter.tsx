"use client";

import { useState, type ReactNode } from "react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useI18n } from "@/i18n/client";
import { cx } from "./ui";
import { useWizard } from "./WizardContext";

/**
 * Spodná lišta pre jednoručné ovládanie: aktuálna cena s rozpisom
 * príplatkov (mení sa pri každej voľbe) a hlavná akcia kroku.
 */
export function StepFooter({ children, hidePrice }: { children?: ReactNode; hidePrice?: boolean }) {
  const { t } = useI18n();
  const { price } = useWizard();
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t border-ink/10 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
      {!hidePrice && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="price-breakdown"
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between text-left text-sm text-ink/75 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <span aria-live="polite">
              {t("common.price_bar", { price: "" })}
              <strong className="text-base text-ink">
                <AnimatedNumber value={price.total} />
              </strong>
            </span>
            <span className="underline underline-offset-4">{t("configurator.price.details")}</span>
          </button>
          <dl id="price-breakdown" hidden={!open} className="mb-2 flex flex-col gap-1 text-sm text-ink/80">
            {price.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt>{line.label}</dt>
                <dd className="tabular-nums">{line.amount}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {children && <div className={cx("flex flex-col gap-2 sm:flex-row-reverse sm:items-center", !hidePrice && "mt-2")}>{children}</div>}
    </div>
  );
}
