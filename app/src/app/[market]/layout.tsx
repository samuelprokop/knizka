import type { Metadata } from "next";
import { Bitter, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CookieConsent } from "@/components/CookieConsent";
import { getMarket, isMarketCode, MARKET_CODES } from "@/config/markets";
import { UiPreviewBadge } from "@/features/ui-preview/UiPreviewBadge";
import { I18nProvider } from "@/i18n/client";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";
import { ToastProvider } from "@/components/Toaster";

const heading = Bitter({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

// Iné trhy ako tie v konfigurácii vrátia 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return MARKET_CODES.map((market) => ({ market }));
}

/*
  SEO trhu: titulok a popis v jazyku trhu, canonical, prepojenie SK ↔ CZ
  (hreflang) a náhľad pri zdieľaní (Open Graph). Podstránky titulok dopĺňajú
  šablónou „… | TAKTIK“.
*/
export async function generateMetadata({ params }: LayoutProps<"/[market]">): Promise<Metadata> {
  const { market: code } = await params;
  if (!isMarketCode(code)) return {};
  const seo = SEO[code];
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: { default: seo.title, template: "%s | TAKTIK" },
    description: seo.description,
    alternates: { canonical: `/${code}`, languages: { "sk-SK": "/sk", "cs-CZ": "/cz" } },
    openGraph: {
      type: "website",
      siteName: "TAKTIK",
      locale: code === "sk" ? "sk_SK" : "cs_CZ",
      url: `/${code}`,
      title: seo.title,
      description: seo.description,
    },
  };
}

const SEO: Record<string, { title: string; description: string }> = {
  sk: {
    title: "Personalizovaná detská kniha s vaším dieťaťom | TAKTIK",
    description:
      "Kniha s menom a podobou vášho dieťaťa. Z fotky nakreslíme hrdinu, vyberiete príbeh a celý náhľad si pozriete zadarmo. E-kniha ihneď, tlač do 5 pracovných dní.",
  },
  cz: {
    title: "Personalizovaná dětská kniha s vaším dítětem | TAKTIK",
    description:
      "Kniha se jménem a podobou vašeho dítěte. Z fotky nakreslíme hrdinu, vyberete příběh a celý náhled si prohlédnete zdarma. E-kniha ihned, tisk do 5 pracovních dnů.",
  },
};

export default async function MarketLayout({ children, params }: LayoutProps<"/[market]">) {
  const { market: code } = await params;
  if (!isMarketCode(code)) notFound();
  const market = getMarket(code);

  return (
    <html
      lang={market.uiLanguage}
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-white text-ink">
        <I18nProvider market={market.code} language={market.uiLanguage}>
          <ToastProvider>
            {children}
            <CookieConsent />
          </ToastProvider>
        </I18nProvider>
        <UiPreviewBadge />
      </body>
    </html>
  );
}
