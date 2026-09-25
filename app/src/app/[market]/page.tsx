import Image from "next/image";
import Link from "next/link";

import { BookHero } from "@/components/BookHero";
import { FooterReveal, FooterRevealContent, FooterRevealFadeOut, FooterRevealFooter } from "@/components/FooterReveal";
import { LandingToc, TOC_INSET_CLASS } from "@/components/LandingToc";
import { SiteFooter } from "@/components/SiteFooter";
import { LANDING_COPY } from "@/content/landing";
import { REVIEWS, REVIEWS_ARE_PLACEHOLDERS, showReviews } from "@/content/reviews";
import { ReviewsSection } from "@/components/ReviewsSection";
import { formatMoney, type Market } from "@/config/markets";
import { FaqSection } from "@/components/FaqSection";
import { LandingMenu } from "@/components/LandingMenu";
import { faqFor, topFaq } from "@/content/faq";
import { LandingHeaderCta } from "@/components/LandingHeaderCta";
import { getMarketContext } from "@/i18n/server";
import { siteUrl } from "@/lib/site-url";

export default async function Home() {
  const { market, t } = await getMarketContext();
  const copy = LANDING_COPY[market.uiLanguage];
  const ctaHref = `/${market.code}/vytvorit`;
  const reviews = showReviews();
  const prices = { ebook: formatMoney(market.prices.ebookOnly, market), print: formatMoney(market.prices.basePrintAndEbook, market) };

  return (
    <FooterReveal>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(market, copy)) }} />
      <FooterRevealContent>
        <main className={TOC_INSET_CLASS}>
          <header className="fixed inset-x-0 top-0 z-50">
            <FooterRevealFadeOut className="flex items-center justify-between px-6 py-3 sm:px-10">
              {/* Identita dočasne TAKTIK; pri vlastnej značke sa vymení logo a tokeny v globals.css. */}
              <Link href={`/${market.code}`} aria-label="TAKTIK">
                <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={81} height={72} priority unoptimized />
              </Link>
              <div className="flex items-center gap-3">
                <LandingHeaderCta href={ctaHref} label={copy.cta} />
                <LandingMenu supportEmail={market.supportEmail} />
              </div>
            </FooterRevealFadeOut>
          </header>

          <LandingToc copy={copy} reviews={reviews} />
          <BookHero copy={copy} ctaHref={ctaHref} prices={prices} />
          {reviews && <ReviewsSection copy={copy.reviews} reviews={REVIEWS[market.uiLanguage]} placeholder={REVIEWS_ARE_PLACEHOLDERS} />}
          {/* Posledné obavy pred nákupom (podoba, fotka, cena, platba, doručenie) – tesne pred pätičkou. */}
          <FaqSection id="otazky" t={t} items={topFaq(faqFor(market))} supportEmail={market.supportEmail} allHref={`/${market.code}/otazky`} />
        </main>
      </FooterRevealContent>
      <FooterRevealFooter>
        <SiteFooter market={market} t={t} />
      </FooterRevealFooter>
    </FooterReveal>
  );
}

/*
  Štruktúrované dáta (schema.org) pre Google: vydavateľ a produkt s cenovým
  rozpätím. Recenzie ani hodnotenie zámerne nie – ukážkové recenzie sa
  nesmú vydávať za skutočné (a Google by ich penalizoval).
*/
function structuredData(market: Market, copy: (typeof LANDING_COPY)[keyof typeof LANDING_COPY]) {
  const base = siteUrl();
  const toUnits = (minor: number) => (minor / 100).toFixed(2);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "TAKTIK vydavateľstvo, s.r.o.",
        url: base,
        logo: `${base}/brand/taktik-logo.svg`,
      },
      {
        "@type": "Product",
        name: copy.eyebrow,
        description: copy.title,
        brand: { "@id": `${base}/#organization` },
        url: `${base}/${market.code}`,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: market.currency,
          lowPrice: toUnits(market.prices.ebookOnly),
          highPrice: toUnits(market.prices.basePrintAndEbook),
          offerCount: 2,
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}
