"use client";

/*
  Úvodná zľava v košíku – „nálepka“ podľa Coupon Reveal Button (21st.dev,
  shadcnspace/button-26), prekreslená do farieb TAKTIK. Klik odlepí nálepku
  (roh sa ohne a nálepka odletí) a pod ňou je kód s tlačidlami Uplatniť
  a Kopírovať.

  Uplatnenie = parameter voucher v URL (košík drží všetky voľby v URL) – súhrn
  sa prepočíta bez posunu stránky. Zľava je skutočná
  (kód z konfigurácie trhu), bez odpočítavania a falošnej naliehavosti.
*/

import { motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE } from "@/lib/motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CopyIcon, TagIcon } from "@/components/icons";
import { useToast } from "@/components/Toaster";
import { useI18n } from "@/i18n/client";

/** Ohnutý roh nálepky v pokoji / pri prejdení myšou (px). */
const FOLD_REST = 14;
const FOLD_HOVER = 22;

type Pt = [number, number];

/**
 * Nálepka sa ohýba po uhlopriečke z pravého horného rohu: línia ohybu y = x − c, kde
 * c = šírka − f. Nálepka ostáva tam, kde y ≥ x − c; odlepená časť sa zrkadlí cez
 * líniu ohybu (x, y) → (y + c, x − c) – to je jej zadná strana. Obdĺžnik orezávame
 * polrovinou (Sutherland–Hodgman), takže tvar sedí pre každé f až po úplné odlepenie.
 */
function clipHalf(poly: Pt[], c: number, keep: "stuck" | "peeled"): Pt[] {
  const inside = ([x, y]: Pt) => (keep === "stuck" ? y >= x - c : y < x - c);
  const cross = ([x1, y1]: Pt, [x2, y2]: Pt): Pt => {
    // Priesečník úsečky s líniou y = x − c.
    const t = (x1 - c - y1) / (y2 - y1 - (x2 - x1));
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  };
  const out: Pt[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) out.push(cross(p, q));
  });
  return out;
}
const toPolygon = (pts: Pt[]) => (pts.length ? `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})` : "polygon(0 0, 0 0, 0 0)");

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
  const peeling = useRef(false);
  // Rozmer nálepky pre výpočet ohybu (px); meria sa pri vykreslení a pri zmene šírky.
  const size = useRef({ w: 320, h: 48 });
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      size.current = { w: el.offsetWidth, h: el.offsetHeight };
      fold.set(fold.get() + 0.001);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fold]);
  const rect = (): Pt[] => [[0, 0], [size.current.w, 0], [size.current.w, size.current.h], [0, size.current.h]];
  const clipPath = useTransform(fold, (f) => toPolygon(clipHalf(rect(), size.current.w - f, "stuck")));
  const flapPath = useTransform(fold, (f) => {
    const c = size.current.w - f;
    return toPolygon(clipHalf(rect(), c, "peeled").map(([x, y]): Pt => [y + c, x - c]));
  });
  // V pokoji sa roh nálepky raz za čas jemne nadvihne – pozvánka odlepiť (idle „dýchanie“).
  const idle = () => {
    if (reduce || peeling.current) return;
    animate(fold, [FOLD_REST, FOLD_REST + 7, FOLD_REST], { duration: 1.6, ease: EASE.inOut, repeat: Infinity, repeatDelay: 3 });
  };
  useEffect(idle, []); // eslint-disable-line react-hooks/exhaustive-deps -- spustiť raz po zobrazení
  const hover = (to: number) => {
    if (reduce || peeling.current) return;
    animate(fold, to, { duration: 0.2, ease: EASE.out }).then(() => to === FOLD_REST && idle());
  };

  // Po odkrytí zameranie na Uplatniť – klávesnica pokračuje tam, kde bola nálepka.
  useEffect(() => {
    if (revealed) applyRef.current?.focus();
  }, [revealed]);

  // Odlepenie celej nálepky: ohyb prejde od pravého horného rohu až za ľavý dolný, na konci zmizne tieň.
  const reveal = async () => {
    peeling.current = true;
    if (!reduce) {
      const { w, h } = size.current;
      await animate(fold, w + h + 2, { duration: 0.8, ease: EASE.inOut });
      await animate(sticker.current, { opacity: 0 }, { duration: 0.12 });
    }
    setRevealed(true);
  };

  const apply = () => {
    const next = new URLSearchParams(params);
    next.set("voucher", code);
    router.replace(`${pathname}?${next}`, { scroll: false });
    toast({ title: t("cart.launch.applied", { percent }), tone: "ok" });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: t("cart.launch.copied", { code }), tone: "ok" });
    } catch {
      // Schránka nedostupná (napr. bez povolenia) – kód je viditeľný, dá sa prepísať.
    }
  };

  return (
    <div ref={boxRef} className="relative h-12">
      {/* Pod nálepkou: kód a akcie. Kým je zalepený, nedá sa naň dostať. */}
      <div
        inert={!revealed}
        className="absolute inset-0 flex items-center gap-1 rounded-xl border-2 border-dashed border-brand-orange-dark/55 bg-white pr-1 pl-3.5"
      >
        <span className="sr-only">{t("cart.launch.code")}: </span>
        <span className="min-w-0 flex-1 truncate font-heading text-base font-extrabold tracking-[0.08em] text-ink">{code}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={t("cart.launch.copy", { code })}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink/65 transition-colors outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
        >
          <CopyIcon className="size-5" />
        </button>
        <button
          ref={applyRef}
          type="button"
          onClick={apply}
          className="min-h-10 shrink-0 rounded-lg bg-brand-orange/10 px-3.5 text-sm font-semibold text-brand-orange-dark ring-1 ring-brand-orange-dark/40 transition outline-none hover:ring-brand-orange-dark focus-visible:ring-4 focus-visible:ring-brand-orange/40"
        >
          {t("cart.launch.apply")}
        </button>
      </div>

      {!revealed && (
        <motion.div ref={sticker} className="absolute inset-0">
          <motion.button
            type="button"
            onClick={reveal}
            onPointerEnter={() => hover(FOLD_HOVER)}
            onPointerLeave={() => hover(FOLD_REST)}
            style={{ clipPath }}
            className="flex size-full items-center justify-center gap-2 rounded-xl bg-[#ffd9c4] text-sm font-semibold text-brand-orange-dark outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <TagIcon className="size-5" />
            {t("cart.launch.reveal", { percent })}
          </motion.button>
          {/* Zadná strana odlepenej časti (zrkadlo cez líniu ohybu); smie presahovať nálepku. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 drop-shadow-[-2px_3px_3px_rgb(23_20_15/0.22)]">
            <motion.span style={{ clipPath: flapPath }} className="absolute inset-0 bg-linear-to-br from-white via-[#fff6f0] to-[#ffe4d6]" />
          </span>
        </motion.div>
      )}
    </div>
  );
}
