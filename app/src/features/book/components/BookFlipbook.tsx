"use client";

/*
  Listovací náhľad knihy (K8.1, proces: Krok 8 – Náhľad): dvojstrany s animovaným
  otáčaním, vodoznak cez obrázky, 3D prehľad dvojstrán (SpreadCarousel3D), zväčšenie strany dvojitým
  klepnutím, ovládanie šípkami, tlačidlami aj potiahnutím prstom.

  Použitie (balík A, krok 7 – 8):
    <BookFlipbook book={withSignedImages(book, market)} onEditPage={(n) => …} />
  Kniha musí mať doplnené podpísané URL obrázkov (server: withSignedImages).
*/

import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { useI18n } from "@/i18n/client";
import { FORMAT_SPECS } from "../design";
import { previewSpreads, type PreviewSpread } from "../model/pages";
import type { Book, PageRef } from "../model/types";
import { BookPage, type PageRenderOptions } from "./BookPage";
import { SpreadCarousel3D } from "./SpreadCarousel3D";

type Sides = { left: PageRef | null; right: PageRef | null };

const sides = (spread: PreviewSpread): Sides =>
  "single" in spread
    ? spread.single.type === "cover"
      ? { left: null, right: spread.single }
      : { left: spread.single, right: null }
    : { left: spread.left, right: spread.right };

type Flip = { from: number; to: number };

export function BookFlipbook({
  book,
  watermark = true,
  onEditPage,
  initialSpread = 0,
  reserveRem = 15,
}: {
  book: Book;
  /** Vodoznak cez ilustrácie – vypína sa až po zaplatení. */
  watermark?: boolean;
  /** Tlačidlo „Upraviť“ pri strane vnútra (editor „Do detailu“, balík A). */
  onEditPage?: (pageNumber: number) => void;
  initialSpread?: number;
  /** Koľko výšky okna (rem) zaberá okolie – kniha sa zmenší, aby sa všetko zmestilo bez posúvania. */
  reserveRem?: number;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const spreads = useMemo(() => previewSpreads(book), [book]);
  const [index, setIndex] = useState(() => Math.min(initialSpread, spreads.length - 1));
  const [flip, setFlip] = useState<Flip | null>(null);
  const [zoom, setZoom] = useState<PageRef | null>(null);

  const opts: PageRenderOptions = useMemo(
    () => ({
      watermark: watermark ? t("book.preview.watermark") : undefined,
      statusLabels: { pending: t("editor.preparing"), needsReview: t("gen.page_for_human") },
    }),
    [t, watermark]
  );

  const format = FORMAT_SPECS[book.options.format];
  const spreadAspect = (format.widthMm * 2) / format.heightMm;

  const go = useCallback(
    (to: number) => {
      if (flip || to < 0 || to >= spreads.length || to === index) return;
      if (reduceMotion || Math.abs(to - index) > 1) {
        setIndex(to);
        return;
      }
      setFlip({ from: index, to });
    },
    [flip, index, reduceMotion, spreads.length]
  );

  useEffect(() => {
    if (zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, zoom]);

  // Potiahnutie prstom
  const swipeStart = useRef<number | null>(null);
  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipeStart.current === null) return;
    const delta = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(delta) > 50) go(delta < 0 ? index + 1 : index - 1);
  };

  const current = sides(spreads[index]);
  const forward = flip ? flip.to > flip.from : true;
  const target = flip ? sides(spreads[flip.to]) : null;

  // Počas otáčania: podklad = to, čo zostane odkryté; list = otáčaná strana.
  const base: Sides = flip && target
    ? forward
      ? { left: current.left, right: target.right }
      : { left: target.left, right: current.right }
    : current;

  const page = (ref: PageRef | null) => {
    if (!ref) return <div aria-hidden="true" />;
    return (
      <div className="relative" onDoubleClick={() => setZoom(ref)}>
        <BookPage book={book} page={ref} opts={opts} />
      </div>
    );
  };

  /** Akcie strany (zväčšiť, upraviť) pod ňou – nezakrývajú ilustráciu. */
  const pageActions = (ref: PageRef | null, side: "left" | "right") => {
    if (!ref) return <div key={side} />;
    const number = ref.type === "interior" ? ref.page.number : null;
    return (
      <div key={side} className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setZoom(ref)}
          className="grid size-11 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-ink/10 transition hover:ring-ink/30 focus-visible:outline-2 focus-visible:outline-brand-orange"
          aria-label={number !== null ? t("book.preview.zoom_page", { n: number }) : t("book.preview.zoom")}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5M11 8v6M8 11h6" strokeLinecap="round" />
          </svg>
        </button>
        {onEditPage && number !== null && (
          <button
            type="button"
            onClick={() => onEditPage(number)}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 transition hover:ring-ink/30 focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 5.5l4 4L8 20H4v-4z" />
            </svg>
            {t("preview.edit_page_n", { n: number })}
          </button>
        )}
      </div>
    );
  };

  const leafFront = flip ? (forward ? current.right : current.left) : null;
  const leafBack = flip && target ? (forward ? target.left : target.right) : null;

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div
        className="relative w-full select-none touch-pan-y"
        style={{ maxWidth: `min(100%, calc((100dvh - ${reserveRem}rem) * ${spreadAspect}))`, perspective: "2400px" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="grid grid-cols-2 drop-shadow-xl">
          {page(base.left)}
          {page(base.right)}
        </div>

        {flip && (
          <motion.div
            className="absolute top-0 h-full w-1/2"
            style={{
              left: forward ? "50%" : 0,
              transformOrigin: forward ? "left center" : "right center",
              transformStyle: "preserve-3d",
            }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: forward ? -180 : 180 }}
            transition={{ duration: 0.7, ease: EASE.inOut }}
            onAnimationComplete={() => {
              setIndex(flip.to);
              setFlip(null);
            }}
          >
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              {leafFront ? <BookPage book={book} page={leafFront} opts={opts} /> : null}
            </div>
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {leafBack ? <BookPage book={book} page={leafBack} opts={opts} /> : null}
            </div>
          </motion.div>
        )}
      </div>

      {/* Akcie strán pod knihou – pod ľavou a pravou stranou, rovnaká šírka ako kniha. */}
      <div
        className={`grid w-full grid-cols-2 gap-3 transition-opacity ${flip ? "pointer-events-none opacity-0" : "opacity-100"}`}
        style={{ maxWidth: `min(100%, calc((100dvh - ${reserveRem}rem) * ${spreadAspect}))` }}
      >
        {pageActions(base.left, "left")}
        {pageActions(base.right, "right")}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="grid size-12 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-ink/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-orange"
          aria-label={t("book.preview.prev")}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="min-w-40 text-center text-sm font-medium text-ink/70" aria-live="polite">
          {spreadLabel(spreads[index], index, spreads.length, t)}
        </p>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === spreads.length - 1}
          className="grid size-12 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-ink/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-orange"
          aria-label={t("book.preview.next")}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Prehľad strán: 3D valec jednotlivých strán; klik = zväčšenie + nalistovanie. */}
      <SpreadCarousel3D
        book={book}
        spreads={spreads}
        current={index}
        label={t("book.preview.thumbnails")}
        spreadLabel={(i) => spreadLabel(spreads[i], i, spreads.length, t)}
        opts={{ watermark: undefined }}
        onSelect={(i) => go(i)}
      />

      {zoom && <ZoomDialog book={book} page={zoom} opts={opts} onClose={() => setZoom(null)} closeLabel={t("book.preview.close")} />}
    </section>
  );
}

function spreadLabel(spread: PreviewSpread, index: number, total: number, t: ReturnType<typeof useI18n>["t"]) {
  if (spread.id === "cover") return t("book.preview.cover");
  if (spread.id === "back") return t("book.preview.back_cover");
  return t("book.preview.position", { n: index, total: total - 2 });
}

function ZoomDialog({
  book,
  page,
  opts,
  onClose,
  closeLabel,
}: {
  book: Book;
  page: PageRef;
  opts: PageRenderOptions;
  onClose: () => void;
  closeLabel: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const format = FORMAT_SPECS[book.options.format];
  const aspect = format.widthMm / format.heightMm;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={closeLabel}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full"
        style={{ maxWidth: `min(100%, calc((100dvh - 2rem) * ${aspect}))` }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={onClose}
      >
        <BookPage book={book} page={page} opts={opts} />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 h-11 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow focus-visible:outline-2 focus-visible:outline-brand-orange"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
