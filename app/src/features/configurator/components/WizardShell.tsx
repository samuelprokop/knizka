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
import { HeaderCart } from "@/components/HeaderCart";
import { HomeIcon } from "@/components/icons";
import { SaveExitButton } from "./SaveExitButton";
import { WizardProvider, type PriceView } from "./WizardContext";
import { StepTransition, SubStepSuffix, WizardProgress, type ProgressItem } from "./WizardMotion";

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
  cartHref = null,
  cartCount = 0,
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
  /** Kniha je schválená a čaká v košíku – ikona košíka vedie tam. */
  cartHref?: string | null;
  cartCount?: number;
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
          {/* Mobil: logo + uložiť, pod tým pás krokov. Od tabletu jeden riadok: logo | kroky | uložiť. */}
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 md:flex-nowrap md:py-1.5 lg:max-w-5xl">
            <Link href={`/${market.code}`} aria-label="TAKTIK" className="shrink-0 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={56} height={50} unoptimized className="md:h-11 md:w-auto" />
            </Link>
            <div className="order-last w-full md:order-none md:min-w-0 md:flex-1">
              <WizardProgress
                items={progress}
                current={current - 1}
                label={t("configurator.progress.label")}
                back={prevHref ? { href: prevHref, label: t("common.back") } : null}
                backLabel={t("common.back")}
              />
              {/* Na mobile nie sú názvy pri bodkách – aktuálny krok slovom. */}
              <p className="pb-2 text-center text-sm font-medium text-ink/70 md:hidden">
                {stepLabel(current, title.progressKey)}
                <SubStepSuffix />
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* Na úvod – rozpracovaná kniha ostáva uložená (návrat cez menu úvodnej stránky). */}
              <Link
                href={`/${market.code}`}
                aria-label={t("configurator.home")}
                title={t("configurator.home")}
                className="flex size-11 items-center justify-center rounded-full text-ink/70 outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
              >
                <HomeIcon className="size-5" />
              </Link>
              {projectId && <SaveExitButton projectId={projectId} />}
              <HeaderCart href={cartHref} count={cartCount} />
            </div>
          </div>
        </header>

        {/* Obsah kroku v karte (od tabletu); na mobile na celú šírku. */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-x-clip px-4 pt-5 sm:px-6 sm:pb-6 md:pt-4 lg:max-w-5xl">
          <StepTransition
            index={current}
            className="flex flex-1 flex-col gap-5 sm:overflow-clip sm:rounded-3xl sm:bg-white sm:px-6 sm:pt-5 lg:px-8 sm:shadow-md sm:shadow-ink/[0.04] sm:ring-1 sm:ring-ink/[0.06]"
          >
            {notice}
            {children}
          </StepTransition>
        </main>
      </div>
    </WizardProvider>
  );
}
