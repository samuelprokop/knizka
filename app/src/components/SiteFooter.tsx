import Image from "next/image";
import Link from "next/link";

import { CookieSettingsLink } from "@/components/CookieConsent";
import type { Market } from "@/config/markets";
import type { Translator } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";

/*
  Pätička verejných stránok v identite TAKTIK: oranžové pozadie, tmavý text
  (biely text na #FF661A nemá dostatočný kontrast), logo jednofarebne tmavé.
  Väčšina odkazov vedie priamo na odpovede v častých otázkach (/otazky#…) –
  zákazník hľadá odpoveď, nie ďalšiu stránku; podmienky majú vlastnú stránku.
*/

type Column = { title: MessageKey; links: { label: MessageKey; href: string }[] };

export function SiteFooter({ market, t }: { market: Market; t: Translator }) {
  const faq = (anchor = "") => `/${market.code}/otazky${anchor && `#${anchor}`}`;
  const terms = (anchor = "") => `/${market.code}/obchodne-podmienky${anchor && `#${anchor}`}`;
  const columns: Column[] = [
    {
      title: "footer.col.book",
      links: [
        { label: "footer.link.how", href: faq("ako-vznika") },
        { label: "footer.link.stories", href: faq("pribehy") },
        { label: "footer.link.photo", href: faq("fotka") },
        { label: "footer.link.pricing", href: faq("cena") },
        { label: "footer.link.gift", href: faq("dorucenie") },
      ],
    },
    {
      title: "footer.col.help",
      links: [
        { label: "footer.link.faq", href: faq() },
        { label: "footer.link.order_status", href: faq("stav") },
        { label: "footer.link.complaint", href: faq("chyba") },
        { label: "footer.link.contact", href: `mailto:${market.supportEmail}` },
      ],
    },
    {
      title: "footer.col.info",
      links: [
        { label: "footer.link.terms", href: terms() },
        { label: "footer.link.privacy", href: terms("osobne-udaje") },
        { label: "photo.consent.link", href: faq("fotka-sukromie") },
      ],
    },
  ];
  const other = market.code === "sk" ? "cz" : "sk";

  return (
    <div className="bg-brand-orange text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-10 pb-6 sm:px-10 md:gap-12 md:pt-20 md:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12">
          <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-1 md:gap-5">
            <p className="max-w-sm font-heading text-2xl leading-[1.1] font-extrabold md:text-4xl">{t("footer.tagline")}</p>
            <p className="max-w-sm text-ink/80">{t("footer.subline")}</p>
            <Link
              href={`/${market.code}/vytvorit`}
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:ring-4 focus-visible:ring-ink/30 focus-visible:outline-none"
            >
              {t("footer.cta")}
            </Link>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={t(column.title)} className="flex flex-col gap-2 md:gap-3">
              <p className="text-sm font-semibold tracking-wider uppercase text-ink/80">{t(column.title)}</p>
              <ul className="flex flex-col gap-1.5 text-sm md:gap-2 md:text-base">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") ? (
                      <a href={link.href} className="font-medium underline-offset-4 hover:underline">
                        {t(link.label)}
                      </a>
                    ) : (
                      <Link href={link.href} className="font-medium underline-offset-4 hover:underline">
                        {t(link.label)}
                      </Link>
                    )}
                  </li>
                ))}
                {column.title === "footer.col.info" && (
                  <li>
                    <CookieSettingsLink className="text-left font-medium underline-offset-4 hover:underline" />
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/15 pt-5 text-xs text-ink/80 md:flex-row md:items-center md:justify-between md:gap-4 md:pt-6 md:text-sm">
          <div className="flex items-center gap-4">
            {/* Logo TAKTIK jednofarebne tmavé – oranžová značka by na oranžovom pozadí zanikla. */}
            <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={54} height={48} className="brightness-0" unoptimized />
            <div>
              <p>{t("footer.publisher")}</p>
              <p>{t("ai.notice.short")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={`mailto:${market.supportEmail}`} className="font-medium underline-offset-4 hover:underline">
              {market.supportEmail}
            </a>
            <Link href={`/${other}`} hrefLang={other === "cz" ? "cs-CZ" : "sk-SK"} className="font-medium underline-offset-4 hover:underline">
              {t("landing.menu.market")}
            </Link>
            <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
