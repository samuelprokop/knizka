import Link from "next/link";

import type { FaqItem } from "@/content/faq";
import type { Translator } from "@/i18n/format";
import { FaqAccordion } from "./FaqAccordion";
import { MailIcon, QuestionIcon } from "./icons";

/*
  Sekcia častých otázok (úvodná stránka aj stránka /otazky): odznak, nadpis,
  podnadpis s kontaktom, zoznam otázok a pod ním výzva „Máte ešte otázku?“.
  Na úvodnej stránke rieši posledné obavy pred nákupom (podoba, fotka, cena,
  platba, doručenie) tesne pred pätičkou – odkaz vedie na všetky otázky.
*/
export function FaqSection({
  t,
  items,
  supportEmail,
  allHref,
  id,
  headingLevel = 2,
}: {
  t: Translator;
  items: FaqItem[];
  supportEmail: string;
  /** Odkaz „Všetky otázky“ (na úvodnej stránke); na stránke /otazky chýba. */
  allHref?: string;
  id?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section id={id} aria-labelledby={`${id ?? "faq"}-title`} className="mx-auto flex w-full max-w-3xl scroll-mt-24 flex-col gap-8 px-6 py-16 sm:px-10 md:py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/12 px-3 py-1 text-xs font-semibold tracking-wide text-brand-orange-dark uppercase">
          <QuestionIcon className="size-4" />
          {t("faq.eyebrow")}
        </span>
        <Heading id={`${id ?? "faq"}-title`} className="font-heading text-3xl leading-tight font-extrabold text-balance text-ink md:text-5xl">
          {t("faq.title")}
        </Heading>
        <p className="max-w-xl text-base text-ink/70">
          {t("faq.subtitle")}{" "}
          <a href={`mailto:${supportEmail}`} className="font-semibold text-ink underline decoration-brand-orange/50 underline-offset-4 hover:decoration-brand-orange">
            {supportEmail}
          </a>
          .
        </p>
      </div>

      <FaqAccordion items={items} idPrefix={id ? `${id}-` : ""} />

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
        <div className="flex flex-wrap items-center gap-3">
          {allHref && (
            <Link href={allHref} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              {t("faq.all")}
            </Link>
          )}
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white outline-none transition hover:bg-ink/85 focus-visible:ring-4 focus-visible:ring-ink/30"
          >
            {t("faq.contact.cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
