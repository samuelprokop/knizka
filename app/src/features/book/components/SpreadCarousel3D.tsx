"use client";

/*
  Prehľad knihy ako 3D valec podľa „3D Carousel“ (cult-ui, 21st.dev): na plášti
  valca sú dvojstrany (jedna dvojstrana = jeden široký obrázok). Valec sa otáča
  ťahaním so zotrvačnosťou; dvojstrana, ktorá dosadne dopredu, sa hneď ukáže
  v náhľade nad ním – netreba klikať (klik na dvojstranu ju len otočí dopredu).

  Prístupnosť: každá dvojstrana je tlačidlo s názvom („Dvojstrana 3 z 12“); pri
  zameraní klávesnicou sa valec otočí k nej a náhľad ju nalistuje.
  Pri prefers-reduced-motion bez zotrvačnosti a pružiny.
*/

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { useEffect, useRef } from "react";

import { EASE } from "@/lib/motion";
import { FORMAT_SPECS } from "../design";
import type { PreviewSpread } from "../model/pages";
import type { Book } from "../model/types";
import type { PageRenderOptions } from "./BookPage";
import { BookSpread } from "./BookSpread";

/** Výška dvojstrany na plášti (px) – šírka podľa formátu – a medzera medzi nimi. */
const FACE_HEIGHT = 64;
const GAP = 14;

export function SpreadCarousel3D({
  book,
  spreads,
  current,
  onSelect,
  label,
  spreadLabel,
  opts,
}: {
  book: Book;
  spreads: PreviewSpread[];
  current: number;
  /** Dvojstrana dosadla dopredu (ťahanie, klik, klávesnica) – náhľad ju nalistuje. */
  onSelect: (index: number) => void;
  label: string;
  spreadLabel: (index: number) => string;
  opts: PageRenderOptions;
}) {
  const reduce = useReducedMotion();
  const format = FORMAT_SPECS[book.options.format];
  const faceWidth = Math.round(FACE_HEIGHT * ((format.widthMm * 2) / format.heightMm));
  const count = Math.max(spreads.length, 1);
  const step = 360 / count;
  // Polomer, pri ktorom sa dvojstrany po obvode práve nedotýkajú.
  const radius = Math.max(faceWidth, ((faceWidth + GAP) * count) / (2 * Math.PI));

  const rotation = useMotionValue(0);
  // Valec je posunutý dozadu o polomer – predná dvojstrana má svoju skutočnú veľkosť.
  const transform = useTransform(rotation, (r) => `translateZ(${-radius}px) rotateY(${r}deg)`);
  const dragged = useRef(false);

  /** Index dvojstrany, ktorá je pri danom natočení vpredu. */
  const frontAt = (r: number) => ((Math.round(-r / step) % count) + count) % count;

  const turnTo = (index: number) => {
    const target = -index * step;
    const now = rotation.get();
    // Najkratšou cestou okolo valca.
    const delta = ((((target - now) % 360) + 540) % 360) - 180;
    if (reduce) rotation.set(now + delta);
    else animate(rotation, now + delta, { type: "spring", stiffness: 140, damping: 22 });
  };

  // Listovanie šípkami v náhľade → valec sa natočí na aktuálnu dvojstranu.
  useEffect(() => {
    if (frontAt(rotation.get()) !== current) turnTo(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reaguje len na zmenu dvojstrany
  }, [current]);

  const onPan = (_: PointerEvent, info: PanInfo) => {
    dragged.current = true;
    rotation.set(rotation.get() + info.delta.x * 0.2);
  };
  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    // Zotrvačnosť, dosadnutie na najbližšiu dvojstranu a jej zobrazenie v náhľade.
    const projected = rotation.get() + (reduce ? 0 : info.velocity.x * 0.05);
    const snapped = Math.round(projected / step) * step;
    onSelect(frontAt(snapped));
    if (reduce) rotation.set(snapped);
    else animate(rotation, snapped, { duration: 0.6, ease: EASE.out });
    setTimeout(() => (dragged.current = false), 0);
  };

  return (
    <nav aria-label={label} className="w-full overflow-hidden">
      <motion.div
        onPan={onPan}
        onPanEnd={onPanEnd}
        className="relative mx-auto flex w-full cursor-grab touch-pan-y items-center justify-center select-none active:cursor-grabbing"
        style={{ height: FACE_HEIGHT + 24, perspective: 1100 }}
      >
        <motion.div className="relative [transform-style:preserve-3d]" style={{ width: faceWidth, height: FACE_HEIGHT, transform }}>
          {spreads.map((spread, i) => {
            const active = i === current;
            return (
              <button
                key={spread.id}
                type="button"
                aria-label={spreadLabel(i)}
                aria-current={active ? "true" : undefined}
                onFocus={(e) => {
                  // Len pri klávesnici – zameranie kliknutím nesmie otáčať valec pred ťahaním.
                  if (!e.currentTarget.matches(":focus-visible")) return;
                  turnTo(i);
                  if (!active) onSelect(i);
                }}
                onClick={() => {
                  if (dragged.current) return;
                  turnTo(i);
                  onSelect(i);
                }}
                className={
                  "absolute inset-0 overflow-hidden rounded-md bg-white shadow-md outline-none transition-[box-shadow] [backface-visibility:hidden] focus-visible:ring-4 focus-visible:ring-brand-orange/50 " +
                  (active ? "ring-2 ring-brand-orange" : "ring-1 ring-ink/10")
                }
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
              >
                <span aria-hidden className="pointer-events-none block">
                  <BookSpread book={book} spread={spread} opts={opts} />
                </span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </nav>
  );
}
