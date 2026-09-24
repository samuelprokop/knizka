import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatMoney, type Market } from "@/config/markets";
import { computePrice } from "@/domain/pricing";
import type { Translator } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";
import type { NameContext } from "@/lib/language";
import { priceSelection, type PriceInputs } from "../pricing";
import { PROGRESS_STEPS, progressIndex, stepHref, type StepNumber } from "../steps";
import { SaveExitButton } from "./SaveExitButton";
import { WizardProvider, type PriceView } from "./WizardContext";
import { StepTransition, WizardProgress, type ProgressItem } from "./WizardMotion";

export function priceView(market: Market, t: Translator, inputs: PriceInputs): PriceView {
  const price = computePrice(priceSelection(inputs), market);
  const line = (id: string, quantity: number, amount: number) => ({
    label: t(`configurator.price.${id}` as MessageKey, { n: quantity }),
    amount: formatMoney(amount, market),
  });
  return {
    total: formatMoney(price.totalMinor, market),
    lines: [line(price.base.id, 1, price.base.amountMinor), ...price.surcharges.map((s) => line(s.id, s.quantity, s.amountMinor))],
  };
}

export function WizardShell({
  market,
  t,
  step,
  projectId,
  maxStep,
  price,
  hero,
  bookLanguage,
  notice,
  children,
}: {
  market: Market;
  t: Translator;
  step: StepNumber;
  projectId: string | null;
  /** Najvyšší krok, na ktorý sa dá v lište skočiť. */
  maxStep: StepNumber;
  price: PriceView;
  hero: NameContext | null;
  bookLanguage: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const current = progressIndex(step);
  const title = PROGRESS_STEPS[current - 1] ?? PROGRESS_STEPS[PROGRESS_STEPS.length - 1];
  const stepLabel = (index: number, key: MessageKey) => t("common.progress.step", { n: index, total: PROGRESS_STEPS.length, title: t(key) });

  const progress: ProgressItem[] = PROGRESS_STEPS.map((s, i) => {
    const reachable = !!projectId && s.n <= maxStep && i + 1 !== current;
    return {
      key: s.slug,
      label: t(s.progressKey),
      href: reachable ? stepHref(market.code, projectId!, s.n) : null,
      ariaLabel: stepLabel(i + 1, s.progressKey),
    };
  });
  // Späť = predchádzajúci krok lišty, na ktorý sa dá ísť (generovanie sa preskakuje).
  const previous = projectId ? [...PROGRESS_STEPS].reverse().find((s) => s.n < step && s.n <= maxStep) : undefined;
  const prevHref = previous ? stepHref(market.code, projectId!, previous.n) : null;

  return (
    <WizardProvider value={{ market: market.code, projectId, price, hero, bookLanguage, prevHref }}>
      <div className="flex min-h-dvh flex-col bg-paper">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <Link href={`/${market.code}`} aria-label="TAKTIK" className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={56} height={50} unoptimized />
            </Link>
            {projectId && <SaveExitButton projectId={projectId} />}
          </div>
          <div className="mx-auto max-w-3xl px-2 pb-1 sm:px-4">
            <WizardProgress items={progress} current={current - 1} label={t("configurator.progress.label")} />
            {/* Na mobile nie sú názvy pri bodkách – aktuálny krok slovom. */}
            <p className="pb-2 text-center text-sm font-medium text-ink/70 md:hidden">{stepLabel(current, title.progressKey)}</p>
          </div>
        </header>

        {/* Obsah kroku v karte (od tabletu); na mobile na celú šírku. */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-x-clip px-4 pt-6 sm:px-6 sm:pb-8">
          <StepTransition
            index={current}
            className="flex flex-1 flex-col gap-6 sm:overflow-clip sm:rounded-3xl sm:bg-white sm:px-6 sm:pt-6 sm:shadow-md sm:shadow-ink/[0.04] sm:ring-1 sm:ring-ink/[0.06]"
          >
            {notice}
            {children}
          </StepTransition>
          <p className="mt-4 hidden text-center text-sm text-ink/60 md:block">{stepLabel(current, title.progressKey)}</p>
        </main>
      </div>
    </WizardProvider>
  );
}
