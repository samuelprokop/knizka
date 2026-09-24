"use client";

/*
  Úvodná zľava v pokladni – „nálepka“ podľa Coupon Reveal Button (21st.dev,
  shadcnspace/button-26), prekreslená do farieb TAKTIK. Klik odlepí nálepku
  (roh sa ohne a nálepka odletí) a pod ňou je kód s tlačidlami Uplatniť
  a Kopírovať.

  Uplatnenie = parameter voucher v URL (ako zmena dopravcu) – stránka prepočíta
  súhrn bez posunu a vyplnené polia formulára ostanú. Zľava je skutočná
  (kód z konfigurácie trhu), bez odpočítavania a falošnej naliehavosti.
*/

import { motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CopyIcon, TagIcon } from "@/components/icons";
import { useToast } from "@/components/Toaster";
import { useI18n } from "@/i18n/client";

/** Ohnutý roh nálepky v pokoji / pri prejdení myšou (px). */
const FOLD_REST = 14;
const FOLD_HOVER = 22;

export function CouponReveal({ code, percent }: { code: string; percent: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [sticker, animate] = useAnimate<HTMLDivElement>();
  const applyRef = useRef<HTMLButtonElement>(null);

  const fold = useMotionValue(FOLD_REST);
  const clipPath = useTransform(fold, (f) => `polygon(0 0, calc(100% - ${f}px) 0, 100% ${f}px, 100% 100%, 0 100%)`);

  // Po odkrytí zameranie na Uplatniť – klávesnica pokračuje tam, kde bola nálepka.
  useEffect(() => {
    if (revealed) applyRef.current?.focus();
  }, [revealed]);

  const reveal = async () => {
    if (!reduce) {
      await animate(fold, 46, { duration: 0.3, ease: [0.4, 0, 0.2, 1] });
      await animate(sticker.current, { x: 28, y: -20, rotate: 6, opacity: 0 }, { duration: 0.26, ease: "easeIn" });
    }
    setRevealed(true);
  };

  const apply = () => {
    const next = new URLSearchParams(params);
    next.set("voucher", code);
    router.replace(`${pathname}?${next}`, { scroll: false });
    toast({ title: t("checkout.launch.applied", { percent }), tone: "ok" });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: t("checkout.launch.copied", { code }), tone: "ok" });
    } catch {
      // Schránka nedostupná (napr. bez povolenia) – kód je viditeľný, dá sa prepísať.
    }
  };

  return (
    <div className="grid items-center gap-3 rounded-2xl bg-brand-orange/6 p-3 ring-1 ring-brand-orange/20 sm:grid-cols-[minmax(0,1fr)_15.5rem]">
      <p className="flex items-start gap-2.5 text-sm text-ink/70">
        <TagIcon className="mt-0.5 size-5 shrink-0 text-brand-orange-dark" />
        <span className="flex flex-col">
          <strong className="font-semibold text-ink">{t("checkout.launch.title", { percent })}</strong>
          {t("checkout.launch.body")}
        </span>
      </p>

      <div className="relative h-12">
        {/* Pod nálepkou: kód a akcie. Kým je zalepený, nedá sa naň dostať. */}
        <div
          inert={!revealed}
          className="absolute inset-0 flex items-center gap-1 rounded-xl border-2 border-dashed border-brand-orange-dark/55 bg-white pr-1 pl-3.5"
        >
          <span className="sr-only">{t("checkout.launch.code")}: </span>
          <span className="min-w-0 flex-1 truncate font-heading text-base font-extrabold tracking-[0.08em] text-ink">{code}</span>
          <button
            type="button"
            onClick={copy}
            aria-label={t("checkout.launch.copy", { code })}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink/65 transition-colors outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <CopyIcon className="size-5" />
          </button>
          <button
            ref={applyRef}
            type="button"
            onClick={apply}
            className="min-h-11 shrink-0 rounded-lg bg-brand-orange/10 px-3.5 text-sm font-semibold text-brand-orange-dark ring-1 ring-brand-orange-dark/40 transition outline-none hover:ring-brand-orange-dark focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            {t("checkout.launch.apply")}
          </button>
        </div>

        {!revealed && (
          <motion.div ref={sticker} className="absolute inset-0">
            <motion.button
              type="button"
              onClick={reveal}
              onPointerEnter={() => !reduce && animate(fold, FOLD_HOVER, { duration: 0.2 })}
              onPointerLeave={() => !reduce && animate(fold, FOLD_REST, { duration: 0.2 })}
              style={{ clipPath }}
              className="flex size-full items-center justify-center gap-2 rounded-xl bg-brand-orange font-semibold text-ink shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-brand-orange-dark/50"
            >
              <TagIcon className="size-5" />
              {t("checkout.launch.reveal")}
            </motion.button>
            {/* Ohnutý roh – zadná strana nálepky (odraz odrezaného trojuholníka). */}
            <span aria-hidden className="pointer-events-none absolute top-0 right-0 drop-shadow-[-1px_2px_2px_rgb(23_20_15/0.25)]">
              <motion.span
                style={{ width: fold, height: fold }}
                className="block rounded-bl-md bg-linear-to-br from-[#ffd9c4] to-white [clip-path:polygon(0_0,0_100%,100%_100%)]"
              />
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
