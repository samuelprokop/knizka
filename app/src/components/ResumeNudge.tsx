"use client";

/*
  Pripomienka pre vracajúceho sa zákazníka na úvodnej stránke: „Kniha čaká v košíku“
  alebo „Máte rozpracovanú knihu“ s odkazom presne tam, kde skončil (Zeigarnikov efekt –
  nedokončená vec ťahá späť). Podľa zásad popupov: len pri skutočnom stave na tomto
  zariadení, s krátkym oneskorením, v rohu (neprekrýva obsah), dá sa zavrieť a po
  zavretí sa v tejto relácii už neukáže. Žiadna naliehavosť ani zľava navyše.
*/

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { EASE, EXIT } from "@/lib/motion";
import { BasketIcon, CloseIcon, PencilIcon } from "./icons";
import { useSessionStatus } from "./useSessionStatus";

const SHOW_AFTER_MS = 1200;
const dismissKey = (href: string) => `resume-nudge:${href}`;

function wasDismissed(href: string) {
  try {
    return sessionStorage.getItem(dismissKey(href)) === "1";
  } catch {
    return false;
  }
}

export function ResumeNudge() {
  const { t, market } = useI18n();
  const reduceMotion = useReducedMotion();
  const { resume } = useSessionStatus(market);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!resume || wasDismissed(resume.href)) return;
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [resume]);

  const dismiss = () => {
    setVisible(false);
    try {
      if (resume) sessionStorage.setItem(dismissKey(resume.href), "1");
    } catch {
      // bez úložiska sa pripomienka len zavrie
    }
  };

  const cart = resume?.kind === "cart";
  return (
    <AnimatePresence>
      {visible && resume && (
        <motion.aside
          aria-label={t("landing.resume.label")}
          onKeyDown={(e) => e.key === "Escape" && dismiss()}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE.out } }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, transition: EXIT }}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 flex items-start gap-3 rounded-2xl bg-white p-4 pr-12 shadow-xl ring-1 ring-ink/10 sm:left-auto sm:w-[23rem]"
        >
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/12 text-brand-orange-dark">
            {cart ? <BasketIcon /> : <PencilIcon />}
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div>
              <p className="font-semibold text-ink">{t(cart ? "landing.resume.cart.title" : "landing.resume.progress.title")}</p>
              <p className={"text-sm text-ink/70 " + (cart ? "line-clamp-2" : "")}>{resume.text}</p>
            </div>
            <Link
              href={resume.href}
              className="inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-5 text-sm font-semibold text-white outline-none transition hover:bg-ink/85 focus-visible:ring-4 focus-visible:ring-ink/30"
            >
              {t(cart ? "landing.resume.cart.cta" : "landing.resume.progress.cta")}
            </Link>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("landing.resume.close")}
            className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full text-ink/55 outline-none transition hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <CloseIcon className="size-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
