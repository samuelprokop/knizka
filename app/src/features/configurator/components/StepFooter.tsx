"use client";

import { useState, type ReactNode } from "react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GoBackButton } from "@/components/buttons";
import { InfoIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";
import { cx } from "./ui";
import { useWizard } from "./WizardContext";
import { useSubStepBack } from "./WizardMotion";

/**
 * Spodná lišta pre jednoručné ovládanie: aktuálna cena s rozpisom
 * príplatkov (mení sa pri každej voľbe), Späť na predchádzajúci krok (od tabletu; na mobile je hore pri páse priebehu)
 * a hlavná akcia kroku. Na podstránke vedie Späť cez useSubStep(názov, späť) na hlavnú obrazovku kroku.
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
        // Rozpis príplatkov: pri prejdení myšou / zameraní nad cenou; na dotyk ťuknutím na cenu.
        <div className="group relative md:shrink-0" onMouseLeave={() => setOpen(false)}>
          <button
            type="button"
            aria-expanded={open}
            aria-describedby="price-breakdown"
            onClick={() => setOpen((v) => !v)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            className="flex min-h-11 items-center gap-1 rounded-lg text-left text-sm text-ink/75 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <span aria-live="polite">
              {t("common.price_bar", { price: "" })}
              <strong className="text-base text-ink underline decoration-ink/30 decoration-dotted underline-offset-4">
                <AnimatedNumber value={price.total} />
              </strong>
            </span>
            <InfoIcon className="size-4 text-ink/45" />
          </button>
          <div
            id="price-breakdown"
            role="tooltip"
            className={cx(
              "absolute bottom-full left-0 z-40 mb-2 w-72 rounded-2xl bg-white p-4 text-sm text-ink/80 shadow-xl ring-1 ring-ink/10",
              "invisible translate-y-1 opacity-0 transition-[opacity,translate,visibility] duration-150 motion-reduce:transition-none",
              "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
              open && "visible translate-y-0 opacity-100"
            )}
          >
            <p className="mb-2 font-semibold text-ink">{t("configurator.price.details")}</p>
            <dl className="flex flex-col gap-1">
              {price.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4">
                  <dt>{line.label}</dt>
                  <dd className="tabular-nums">{line.amount}</dd>
                </div>
              ))}
              <div className="mt-1 flex justify-between gap-4 border-t border-ink/10 pt-1.5 font-semibold text-ink">
                <dt>{t("configurator.price.total")}</dt>
                <dd className="tabular-nums">{price.total}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      {(children || backHref || subBack) && (
        <div className={cx("flex items-start gap-2 md:flex-1 md:items-center md:justify-end", !hidePrice && "mt-2 md:mt-0")}>
          {/* Späť je vždy na tom istom mieste – hneď vľavo od hlavnej akcie (predvídateľný návrat, jedna
              hlavná výzva); je tiché, aby jej nekonkurovalo. Na mobile je hore pri páse priebehu. */}
          {(subBack || backHref) && (
            <div className="hidden shrink-0 md:block">
              {subBack ? (
                <GoBackButton onClick={subBack} className="text-base">{t("common.back")}</GoBackButton>
              ) : (
                <GoBackButton href={backHref!} className="text-base">{t("common.back")}</GoBackButton>
              )}
            </div>
          )}
          {children && <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row-reverse sm:items-center md:flex-none">{children}</div>}
        </div>
      )}
    </div>
  );
}
