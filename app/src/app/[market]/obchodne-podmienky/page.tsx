import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AlertIcon } from "@/components/icons";
import { ShopHeader } from "@/components/ShopHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { termsFor } from "@/content/terms";
import { getMarket, isMarketCode } from "@/config/markets";
import { createTranslator } from "@/i18n/format";
import { getMarketContext } from "@/i18n/server";

/* Obchodné podmienky – celé znenie s obsahom (kotvy sekcií, na ne vedie pätička aj pokladňa). */

export async function generateMetadata({ params }: PageProps<"/[market]/obchodne-podmienky">): Promise<Metadata> {
  const { market: code } = await params;
  if (!isMarketCode(code)) return {};
  const market = getMarket(code);
  const t = createTranslator(market.uiLanguage);
  const terms = termsFor(market);
  return {
    title: terms.title,
    description: t("terms.page.description"),
    alternates: { canonical: `/${code}/obchodne-podmienky`, languages: { "sk-SK": "/sk/obchodne-podmienky", "cs-CZ": "/cz/obchodne-podmienky" } },
  };
}

export default async function TermsPage() {
  const { market, t } = await getMarketContext();
  const terms = termsFor(market);

  return (
    <>
      <ShopHeader wide cta />
      <div className="mx-auto w-full max-w-5xl px-6 pt-6 sm:px-10">
        <Breadcrumbs label={t("breadcrumb.label")} items={[{ name: t("breadcrumb.home"), href: `/${market.code}` }, { name: terms.title, href: `/${market.code}/obchodne-podmienky` }]} />
      </div>
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-6 pt-6 pb-20 sm:px-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label={t("terms.toc")} className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase">{t("terms.toc")}</p>
          <ol className="flex flex-col gap-1 text-sm">
            {terms.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 font-medium text-ink/70 outline-none hover:bg-ink/[0.04] hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl">{terms.title}</h1>
            <p className="text-sm text-ink/60">{terms.updated}</p>
            <p className="flex items-start gap-2 rounded-2xl bg-[#fff1d6] px-4 py-3 text-sm text-ink">
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
              {terms.draftNote}
            </p>
          </header>
          {terms.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-24 flex-col gap-3">
              <h2 id={`${s.id}-title`} className="font-heading text-2xl font-extrabold text-ink">
                {s.title}
              </h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="max-w-prose text-base leading-relaxed text-ink/80">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter market={market} t={t} />
    </>
  );
}
