"use client";

/*
  Cookie box – podľa „Privacy First Notice“ (PrebuiltUI, 21st.dev), v identite
  TAKTIK. „Odmietnuť“ a „Prijať“ sú rovnocenné (rovnaká veľkosť aj dostupnosť),
  box neblokuje stránku a dá sa znova otvoriť odkazom „Nastavenia cookies“.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useId, useSyncExternalStore } from "react";

import { useI18n } from "@/i18n/client";
import { cookieBoxSnapshot, onCookieConsentChange, openCookieSettings, saveCookieConsent } from "@/lib/cookie-consent";

export function CookieConsent({ policyHref = "#" }: { policyHref?: string }) {
  const { t } = useI18n();
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  // Na serveri stav nepoznáme – box sa ukáže až v prehliadači (bez nesúladu pri hydratácii).
  const state = useSyncExternalStore(onCookieConsentChange, cookieBoxSnapshot, () => "server");
  const open = state === "open";

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-labelledby={titleId}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: EASE.out }}
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-sm flex-col items-center rounded-3xl bg-white p-6 text-center text-sm text-ink/70 shadow-2xl shadow-ink/15 ring-1 ring-ink/10 sm:right-auto sm:left-6 sm:mx-0 sm:w-96"
        >
          <CookieIcon />
          <h2 id={titleId} className="mt-2 pb-2 font-heading text-xl font-extrabold text-ink">
            {t("cookies.title")}
          </h2>
          <p className="w-11/12">
            {t("cookies.text")}{" "}
            <a href={policyHref} className="font-medium text-ink underline underline-offset-2">
              {t("cookies.policy")}
            </a>
            .
          </p>
          <div className="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => saveCookieConsent("declined")}
              className="flex-1 rounded-full border border-ink/15 py-2.5 font-semibold text-ink transition hover:border-ink/30 hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40 focus-visible:outline-none active:scale-95"
            >
              {t("cookies.decline")}
            </button>
            <button
              type="button"
              onClick={() => saveCookieConsent("accepted")}
              className="flex-1 rounded-full bg-brand-orange py-2.5 font-semibold text-ink transition hover:bg-[#ff7a36] focus-visible:ring-4 focus-visible:ring-brand-orange/40 focus-visible:outline-none active:scale-95"
            >
              {t("cookies.accept")}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** Odkaz na znovuotvorenie boxu (pätička). */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {t("footer.link.cookies")}
    </button>
  );
}

function CookieIcon() {
  return (
    <svg aria-hidden viewBox="0 0 56 56" className="size-14">
      {/* Sušienka s odhryznutým rohom v oranžovej TAKTIK. */}
      <path
        d="M28 4a24 24 0 1 0 24 24 7 7 0 0 1-7.6-7.4A7 7 0 0 1 36 12.2 7.2 7.2 0 0 1 35 5 24 24 0 0 0 28 4Z"
        className="fill-brand-orange"
      />
      <g className="fill-ink">
        <circle cx="19" cy="21" r="3" />
        <circle cx="31" cy="31" r="2.5" />
        <circle cx="18" cy="36" r="2.5" />
        <circle cx="38" cy="41" r="2" />
        <circle cx="27" cy="44" r="1.8" />
      </g>
    </svg>
  );
}
