import { notFound } from "next/navigation";

import { loadPersonalPage } from "@/features/checkout/server/personal";
import { buttonClass, StepTitle } from "@/features/configurator/components/ui";
import { getMarketContext } from "@/i18n/server";

export default async function PersonalBookPage({ params }: PageProps<"/[market]/moja-kniha/[token]">) {
  const { market, t } = await getMarketContext();
  const { token } = await params;
  const view = await loadPersonalPage(token);
  if (!view || view.market !== market.code) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-10 text-center">
      <StepTitle title={view.bookTitle} subtitle={t("book.imprint.qr")} />
      {view.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- podpísaná URL
        <img src={view.thumbnailUrl} alt="" className="mx-auto h-64 w-48 rounded-xl object-cover shadow-lg" />
      ) : null}

      <div className="flex flex-col items-center gap-3">
        {view.latestOrderId && (
          <a href={`/${market.code}/moja-kniha/${token}/ebook`} className={buttonClass("primary")}>
            {t("thanks.download_ebook")}
          </a>
        )}
        <a href={`/${market.code}/moja-kniha/${token}/objednat`} className={buttonClass("secondary")}>
          {t("personal.reorder")}
        </a>
      </div>
    </main>
  );
}
