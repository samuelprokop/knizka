import Image from "next/image";
import Link from "next/link";

import { BookHero } from "@/components/BookHero";
import { FooterReveal, FooterRevealContent, FooterRevealFadeOut, FooterRevealFooter } from "@/components/FooterReveal";
import { LandingToc, TOC_INSET_CLASS } from "@/components/LandingToc";
import { SiteFooter } from "@/components/SiteFooter";
import { LANDING_COPY } from "@/content/landing";
import { REVIEWS, REVIEWS_ARE_PLACEHOLDERS, showReviews } from "@/content/reviews";
import { ReviewsSection } from "@/components/ReviewsSection";
import { getMarketContext } from "@/i18n/server";

export default async function Home() {
  const { market, t } = await getMarketContext();
  const copy = LANDING_COPY[market.uiLanguage];
  const ctaHref = `/${market.code}/vytvorit`;
  const reviews = showReviews();

  return (
    <FooterReveal>
      <FooterRevealContent>
        <main className={TOC_INSET_CLASS}>
          <header className="fixed inset-x-0 top-0 z-50">
            <FooterRevealFadeOut className="flex items-center justify-between px-6 py-3 sm:px-10">
              {/* Identita dočasne TAKTIK; pri vlastnej značke sa vymení logo a tokeny v globals.css. */}
              <Link href={`/${market.code}`} aria-label="TAKTIK">
                <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={81} height={72} priority unoptimized />
              </Link>
              <Link
                href={ctaHref}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30"
              >
                {copy.cta}
              </Link>
            </FooterRevealFadeOut>
          </header>

          <LandingToc copy={copy} reviews={reviews} />
          <BookHero copy={copy} ctaHref={ctaHref} />
          {reviews && <ReviewsSection copy={copy.reviews} reviews={REVIEWS[market.uiLanguage]} placeholder={REVIEWS_ARE_PLACEHOLDERS} />}
        </main>
      </FooterRevealContent>
      <FooterRevealFooter>
        <SiteFooter market={market} t={t} />
      </FooterRevealFooter>
    </FooterReveal>
  );
}
