import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqAccordion } from "@/components/FaqAccordion";
import { MailIcon, QuestionIcon } from "@/components/icons";
import { ShopHeader } from "@/components/ShopHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { faqFor } from "@/content/faq";
import { getMarket, isMarketCode } from "@/config/markets";
import { createTranslator } from "@/i18n/format";
import { getMarketContext } from "@/i18n/server";

/*
  Časté otázky (celý zoznam po kategóriách). Každá kategória aj otázka má kotvu –
  pätička a menu vedú priamo na ne (/otazky#fotka-sukromie). Štruktúrované dáta
  FAQPage (schema.org) zodpovedajú presne textu na stránke.
*/

export async function generateMetadata({ params }: PageProps<"/[market]/otazky">): Promise<Metadata> {
  const { market: code } = await params;
  if (!isMarketCode(code)) return {};
  const t = createTranslator(getMarket(code).uiLanguage);
  return {
    title: t("faq.page.title"),
    description: t("faq.page.description"),
    alternates: { canonical: `/${code}/otazky`, languages: { "sk-SK": "/sk/otazky", "cs-CZ": "/cz/otazky" } },
    openGraph: { title: t("faq.page.title"), description: t("faq.page.description"), url: `/${code}/otazky` },
  };
}

export default async function FaqPage() {
  const { market, t } = await getMarketContext();
  const categories = faqFor(market);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: categories.flatMap((c) => c.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ShopHeader wide cta />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pt-6 pb-20 sm:px-10">
        <Breadcrumbs label={t("breadcrumb.label")} items={[{ name: t("breadcrumb.home"), href: `/${market.code}` }, { name: t("faq.eyebrow"), href: `/${market.code}/otazky` }]} />
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/12 px-3 py-1 text-xs font-semibold tracking-wide text-brand-orange-dark uppercase">
            <QuestionIcon className="size-4" />
            {t("faq.eyebrow")}
          </span>
          <h1 className="font-heading text-4xl leading-tight font-extrabold text-balance text-ink md:text-5xl">{t("faq.page.title")}</h1>
          <p className="max-w-xl text-base text-ink/70">
            {t("faq.subtitle")}{" "}
            <a href={`mailto:${market.supportEmail}`} className="font-semibold text-ink underline decoration-brand-orange/50 underline-offset-4 hover:decoration-brand-orange">
              {market.supportEmail}
            </a>
            .
          </p>
          {/* Rýchly skok na kategóriu. */}
          <nav aria-label={t("faq.eyebrow")} className="mt-2 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="min-h-11 content-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-ink/12 outline-none transition hover:ring-ink/30 focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                {c.title}
              </a>
            ))}
          </nav>
        </div>

        {categories.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-title`} className="flex scroll-mt-24 flex-col gap-3">
            <h2 id={`${c.id}-title`} className="font-heading text-2xl font-extrabold text-ink">
              {c.title}
            </h2>
            <FaqAccordion items={c.items} />
          </section>
        ))}

        <div className="flex flex-col items-start gap-4 rounded-3xl bg-paper p-5 ring-1 ring-ink/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white">
              <MailIcon className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">{t("faq.contact.title")}</p>
              <p className="text-sm text-ink/65">{t("faq.contact.body")}</p>
            </div>
          </div>
          <a href={`mailto:${market.supportEmail}`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white outline-none transition hover:bg-ink/85 focus-visible:ring-4 focus-visible:ring-ink/30">
            {t("faq.contact.cta")}
          </a>
        </div>
      </main>
      <SiteFooter market={market} t={t} />
    </>
  );
}
