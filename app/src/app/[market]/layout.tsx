import type { Metadata } from "next";
import { Bitter, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CookieConsent } from "@/components/CookieConsent";
import { getMarket, isMarketCode, MARKET_CODES } from "@/config/markets";
import { UiPreviewBadge } from "@/features/ui-preview/UiPreviewBadge";
import { I18nProvider } from "@/i18n/client";
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

export const metadata: Metadata = {
  title: "Personalizovaná detská kniha – prototyp",
  description: "Prototyp: personalizované detské knihy s vaším dieťaťom ako hrdinom.",
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
