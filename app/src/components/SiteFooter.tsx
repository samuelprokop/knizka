import Image from "next/image";
import Link from "next/link";

import { CookieSettingsLink } from "@/components/CookieConsent";
import type { Market } from "@/config/markets";
import type { Translator } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";

/*
  Pätička verejných stránok v identite TAKTIK: oranžové pozadie, tmavý text
  (biely text na #FF661A nemá dostatočný kontrast), logo jednofarebne tmavé.
  Odkazy na obsahové stránky sú PLACEHOLDER, kým tieto stránky nevzniknú.
*/

const PLACEHOLDER = "#";

type Column = { title: MessageKey; links: { label: MessageKey; href: string }[] };

export function SiteFooter({ market, t }: { market: Market; t: Translator }) {
  const columns: Column[] = [
    {
      title: "footer.col.book",
      links: [
        { label: "footer.link.how", href: PLACEHOLDER },
        { label: "footer.link.stories", href: PLACEHOLDER },
        { label: "footer.link.pricing", href: PLACEHOLDER },
      ],
    },
    {
      title: "footer.col.help",
      links: [
        { label: "footer.link.faq", href: PLACEHOLDER },
        { label: "footer.link.contact", href: `mailto:${market.supportEmail}` },
      ],
    },
    {
      title: "footer.col.info",
      links: [
        { label: "footer.link.terms", href: PLACEHOLDER },
        { label: "footer.link.privacy", href: PLACEHOLDER },
        { label: "photo.consent.link", href: PLACEHOLDER },
      ],
    },
  ];

  return (
    <div className="bg-brand-orange text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-10 pb-6 sm:px-10 md:gap-12 md:pt-20 md:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12">
          <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-1 md:gap-5">
            <p className="max-w-sm font-heading text-2xl leading-[1.1] font-extrabold md:text-4xl">{t("footer.tagline")}</p>
            <p className="max-w-sm text-ink/75">{t("footer.subline")}</p>
            <Link
              href={`/${market.code}/vytvorit`}
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:ring-4 focus-visible:ring-ink/30 focus-visible:outline-none"
            >
              {t("footer.cta")}
            </Link>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={t(column.title)} className="flex flex-col gap-2 md:gap-3">
              <p className="text-sm font-semibold tracking-wider uppercase text-ink/60">{t(column.title)}</p>
              <ul className="flex flex-col gap-1.5 text-sm md:gap-2 md:text-base">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="font-medium underline-offset-4 hover:underline">
                      {t(link.label)}
                    </a>
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

        <div className="flex flex-col gap-3 border-t border-ink/15 pt-5 text-xs text-ink/70 md:flex-row md:items-center md:justify-between md:gap-4 md:pt-6 md:text-sm">
          <div className="flex items-center gap-4">
            {/* Logo TAKTIK jednofarebne tmavé – oranžová značka by na oranžovom pozadí zanikla. */}
            <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={54} height={48} className="brightness-0" unoptimized />
            <div>
              <p>{t("footer.publisher")}</p>
              <p>{t("ai.notice.short")}</p>
            </div>
          </div>
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  );
}
