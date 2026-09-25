"use client";

/*
  Súhlas s obchodnými podmienkami v pokladni. Odkaz v texte otvorí okno s celým
  znením podľa „Terms & Conditions“ (21st.dev, mvp_Subha): text sa posúva vnútri
  okna, hore je pás prečítania a „Súhlasím“ je aktívne po dočítaní – a rovno
  zaškrtne súhlas. Rýchla cesta ostáva: políčko sa dá zaškrtnúť aj bez okna.
*/

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useId, useRef, useState } from "react";

import { CloseIcon } from "@/components/icons";
import type { Terms } from "@/content/terms";
import { RequiredCheck } from "@/features/configurator/components/RequiredCheck";
import { buttonClass } from "@/features/configurator/components/ui";
import { useI18n } from "@/i18n/client";

export function TermsAgreement({ terms, pageHref }: { terms: Terms; pageHref: string }) {
  const { t } = useI18n();
  const ids = useId();
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState(false);
  const [read, setRead] = useState(false);
  const progress = useMotionValue(0);
  const smooth = useSpring(progress, { stiffness: 260, damping: 32 });

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const ratio = el.scrollHeight <= el.clientHeight ? 1 : el.scrollTop / (el.scrollHeight - el.clientHeight);
    progress.set(Math.min(1, ratio));
    if (ratio > 0.97) setRead(true);
  };

  const open = (e: React.MouseEvent) => {
    // Odkaz je v popise políčka – klik nesmie zároveň prepnúť políčko.
    e.preventDefault();
    e.stopPropagation();
    dialogRef.current?.showModal();
    requestAnimationFrame(onScroll);
  };

  return (
    <>
      <RequiredCheck name="termsAccepted" message={t("checkout.terms.required")} checked={checked} onCheckedChange={setChecked}>
        <span className="text-sm">
          {t("checkout.terms.before")}{" "}
          <a href={pageHref} onClick={open} className="font-semibold text-brand-orange-dark underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-4 focus-visible:ring-brand-orange/40">
            {t("checkout.terms.link")}
          </a>
        </span>
      </RequiredCheck>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        className="m-auto w-[min(100vw-2rem,36rem)] overflow-hidden rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="flex max-h-[min(85dvh,44rem)] flex-col">
          <div className="relative flex items-start justify-between gap-3 border-b border-ink/10 px-6 pt-5 pb-4">
            <div>
              <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">
                {terms.title}
              </h2>
              <p className="mt-1 text-xs text-ink/55">{terms.draftNote}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("common.close")}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
            >
              <CloseIcon className="size-5" />
            </button>
            {/* Pás prečítania. */}
            <motion.span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand-orange" style={{ scaleX: reduce ? progress : smooth }} />
          </div>

          <div ref={bodyRef} onScroll={onScroll} tabIndex={0} autoFocus aria-label={terms.title} className="flex-1 overflow-y-auto px-6 py-5 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-orange/30">
            {terms.sections.map((s) => (
              <section key={s.id} className="mb-5 last:mb-0">
                <h3 className="mb-1.5 font-semibold text-ink">{s.title}</h3>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-ink/75 last:mb-0">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            <a href={pageHref} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-orange-dark underline underline-offset-4">
              {t("terms.dialog.full")}
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-6 py-4">
            <p className="text-xs text-ink/60" aria-live="polite">
              {read ? t("terms.dialog.read") : t("terms.dialog.hint")}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("secondary", "min-h-11 px-5")}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!read}
                onClick={() => {
                  setChecked(true);
                  dialogRef.current?.close();
                }}
                className={buttonClass("primary", "min-h-11 px-5")}
              >
                {t("terms.dialog.agree")}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
