import { notFound, redirect } from "next/navigation";

import { cartHrefFor, sessionCart } from "@/features/checkout/server/cart";
import { SessionExpired } from "@/features/configurator/components/SessionExpired";
import { priceView, WizardShell } from "@/features/configurator/components/WizardShell";
import { Notice } from "@/features/configurator/components/ui";
import { lookOf } from "@/features/configurator/server/book";
import { loadBundle, nameContextOf, progressFacts } from "@/features/configurator/server/bundle";
import { touchStep } from "@/features/configurator/server/projects";
import { hasProjectSession } from "@/features/configurator/server/session";
import { changeRegeneratesBook } from "@/features/configurator/status";
import { maxReachableStep, stepBySlug, stepHref } from "@/features/configurator/steps";
import { renderStep } from "@/features/configurator/server/render-step";
import { getMarketContext } from "@/i18n/server";

// Projekty nie sú známe pri zostavení – stránky vznikajú za behu.
export const dynamicParams = true;

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function StepPage({ params, searchParams }: PageProps<"/[market]/kniha/[id]/[krok]">) {
  const { id, krok } = await params;
  const query = await searchParams;
  const { market, t } = await getMarketContext();
  const step = stepBySlug(krok);
  if (!step || !isUuid(id)) notFound();

  if (!(await hasProjectSession(id))) return <SessionExpired projectId={id} />;
  const bundle = await loadBundle(id);
  if (!bundle || bundle.project.market !== market.code) notFound();

  // Závislosti krokov: dopredu sa dá ísť len tam, kam už zákazník smie.
  const max = maxReachableStep(progressFacts(bundle));
  if (step.n > max) redirect(stepHref(market.code, id, max));
  if (step.n === 7 && max === 9) redirect(stepHref(market.code, id, 8));
  if (step.n === 1 && !bundle.hero) notFound();
  await touchStep(id, step.n);

  const status = bundle.project.status;
  // Košík v hlavičke: všetky schválené knihy na tomto zariadení (nielen táto).
  const cart = await sessionCart(market.code);
  const notice =
    changeRegeneratesBook(status) && step.n <= 6 ? (
      <Notice tone="warn">{t("common.change_earlier_step", { minutes: 10 })}</Notice>
    ) : status === "generating" && step.n <= 6 ? (
      <Notice tone="info">{t("gen.browse")}</Notice>
    ) : null;

  return (
    <WizardShell
      market={market}
      t={t}
      step={step.n}
      projectId={id}
      maxStep={max}
      hero={bundle.hero ? nameContextOf(bundle.hero) : null}
      bookLanguage={bundle.project.bookLanguage}
      notice={notice}
      cartHref={cartHrefFor(market.code, cart)}
      cartCount={cart.length}
      price={priceView(market, t, {
        storyPath: bundle.project.storyPath,
        companionCount: bundle.companions.length,
        pageCount: bundle.project.pageCount,
        format: bundle.project.format,
        coloringBook: lookOf(bundle).coloringBook,
      })}
    >
      {await renderStep(step.n, { bundle, market, t, query })}
    </WizardShell>
  );
}
