import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { BookFlipbook } from "@/features/book/components/BookFlipbook";
import { loadPersonalPage } from "@/features/checkout/server/personal";
import { buttonClass } from "@/features/configurator/components/ui";
import { pluralForm } from "@/i18n/plural";
import { getMarketContext } from "@/i18n/server";
import { BookIcon, ChevronRightIcon, DownloadIcon, LockIcon, PlusIcon, PrinterIcon } from "@/components/icons";
import { ShopHeader } from "@/components/ShopHeader";

/*
  Osobná stránka knihy (7.3) – sem vedie QR kód z tiráže. Rodič (alebo babka, ktorej
  knihu darovali) tu knihu prelistuje, stiahne e-knihu a pracovné listy a objedná
  ďalší výtlačok. Prístup len cez neuhádnuteľný odkaz, bez prihlásenia.

  Na jednu obrazovku: vľavo listovanie (hlavný obsah), vpravo čo sa tu dá robiť –
  jedna hlavná akcia (e-kniha), ostatné ako tiché riadky.
*/
export default async function PersonalBookPage({ params }: PageProps<"/[market]/moja-kniha/[token]">) {
  const { market, t } = await getMarketContext();
  const { token } = await params;
  const view = await loadPersonalPage(token);
  if (!view || view.market !== market.code) notFound();

  const base = `/${market.code}/moja-kniha/${token}`;
  const paid = !!view.latestOrderId;

  return (
    <>
      <ShopHeader home wide="book" />
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
        <header className="flex flex-col gap-2 lg:col-start-2 lg:row-start-1">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-orange/12 px-3 py-1 text-xs font-semibold tracking-wide text-brand-orange-dark uppercase">
            <BookIcon className="size-4" />
            {t("personal.eyebrow")}
          </span>
          <h1 className="font-heading text-3xl leading-tight font-extrabold text-balance text-ink">{view.bookTitle}</h1>
          <p className="text-base text-pretty text-ink/70">{t("personal.intro", undefined, view.hero)}</p>
        </header>

        <section aria-label={t("personal.flip")} className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <BookFlipbook book={view.signedBook} watermark={!paid} reserveRem={12} />
        </section>

        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:self-start">
          {paid ? (
            <a href={`${base}/ebook`} className={buttonClass("primary", "w-full")}>
              <DownloadIcon />
              {t("thanks.download_ebook")}
            </a>
          ) : (
            <p className="rounded-2xl bg-paper p-4 text-sm text-ink/75 ring-1 ring-ink/10">{t("personal.pending")}</p>
          )}

          <ul className="flex flex-col divide-y divide-ink/10 rounded-2xl bg-white ring-1 ring-ink/10">
            {paid && view.worksheetCount > 0 && (
              <ActionRow
                href={`${base}/pracovne-listy`}
                icon={<PrinterIcon />}
                title={t("personal.worksheets.title")}
                text={t(`personal.worksheets.text.${pluralForm(view.worksheetCount)}`, { n: view.worksheetCount })}
              />
            )}
            <ActionRow
              href={`${base}/objednat`}
              icon={<BookIcon />}
              title={t("personal.reorder")}
              text={t("personal.reorder.text")}
            />
            <ActionRow
              href={`/${market.code}/vytvorit`}
              icon={<PlusIcon />}
              title={t("personal.another.title")}
              text={t("personal.another.text")}
            />
          </ul>

          <p className="flex items-start gap-2 text-sm text-ink/60">
            <LockIcon className="mt-0.5 size-4 shrink-0" />
            {t("personal.private")}
          </p>
        </div>
      </main>
    </>
  );
}

function ActionRow({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <li>
      <a
        href={href}
        className="group flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 outline-none transition-colors hover:bg-paper focus-visible:ring-4 focus-visible:ring-brand-orange/40"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/12 text-brand-orange-dark">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-ink">{title}</span>
          <span className="text-sm text-ink/65">{text}</span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none" />
      </a>
    </li>
  );
}
