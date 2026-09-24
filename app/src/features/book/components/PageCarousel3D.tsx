"use client";

/*
  Prehľad strán ako 3D valec podľa „3D Carousel“ (cult-ui, 21st.dev): jednotlivé
  strany knihy sú na plášti valca, ťahaním (myš/prst) sa valec otáča so zotrvačnosťou.
  Klik na stranu ju otvorí zväčšenú v okne a knihu nalistuje na jej dvojstranu.

  Prístupnosť: každá strana je tlačidlo s názvom („Strana 5“); pri zameraní
  klávesnicou sa valec otočí k nej. Pri prefers-reduced-motion bez zotrvačnosti.
*/

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { useEffect, useMemo, useRef } from "react";

import { FORMAT_SPECS } from "../design";
import type { Book, PageRef } from "../model/types";
import { BookPage, type PageRenderOptions } from "./BookPage";

export type CarouselPage = { key: string; ref: PageRef; spreadIndex: number; label: string };

/** Výška strany na plášti (px) – šírka podľa formátu (na výšku aj na šírku) – a medzera medzi stranami. */
const FACE_HEIGHT = 72;
const GAP = 12;

export function PageCarousel3D({
  book,
  pages,
  currentSpread,
  onPick,
  label,
  opts,
}: {
  book: Book;
  pages: CarouselPage[];
  currentSpread: number;
  onPick: (page: CarouselPage) => void;
  label: string;
  opts: PageRenderOptions;
}) {
  const reduce = useReducedMotion();
  const format = FORMAT_SPECS[book.options.format];
  const faceHeight = FACE_HEIGHT;
  const faceWidth = Math.round(FACE_HEIGHT * (format.widthMm / format.heightMm));
  const count = Math.max(pages.length, 1);
  const step = 360 / count;
  // Polomer, pri ktorom sa strany po obvode práve nedotýkajú.
  const radius = Math.max(faceWidth * 1.5, ((faceWidth + GAP) * count) / (2 * Math.PI));

  const rotation = useMotionValue(0);
  // Valec je posunutý dozadu o polomer – predná strana má svoju skutočnú veľkosť.
  const transform = useTransform(rotation, (r) => `translateZ(${-radius}px) rotateY(${r}deg)`);
  const dragged = useRef(false);

  const indexOfSpread = useMemo(() => {
    const map = new Map<number, number>();
    pages.forEach((p, i) => !map.has(p.spreadIndex) && map.set(p.spreadIndex, i));
    return map;
  }, [pages]);

  // Otočiť k strane (najkratšou cestou okolo valca).
  const turnTo = (index: number) => {
    const target = -index * step;
    const current = rotation.get();
    const delta = ((((target - current) % 360) + 540) % 360) - 180;
    if (reduce) rotation.set(current + delta);
    else animate(rotation, current + delta, { type: "spring", stiffness: 140, damping: 22 });
  };

  // Listovanie v knihe → valec sa natočí na aktuálnu dvojstranu.
  useEffect(() => {
    const index = indexOfSpread.get(currentSpread);
    if (index !== undefined) turnTo(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reaguje len na zmenu dvojstrany
  }, [currentSpread, indexOfSpread]);

  const onPan = (_: PointerEvent, info: PanInfo) => {
    dragged.current = true;
    rotation.set(rotation.get() + info.delta.x * 0.25);
  };
  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    // Zotrvačnosť a dosadnutie na najbližšiu stranu.
    const projected = rotation.get() + (reduce ? 0 : info.velocity.x * 0.06);
    const snapped = Math.round(projected / step) * step;
    if (reduce) rotation.set(snapped);
    else animate(rotation, snapped, { type: "spring", stiffness: 90, damping: 20, velocity: info.velocity.x * 0.25 });
    // Klik po ťahaní sa nepočíta ako výber strany.
    setTimeout(() => (dragged.current = false), 0);
  };

  return (
    <nav aria-label={label} className="w-full overflow-hidden">
      <motion.div
        onPan={onPan}
        onPanEnd={onPanEnd}
        className="relative mx-auto flex w-full cursor-grab touch-pan-y items-center justify-center select-none active:cursor-grabbing"
        style={{ height: faceHeight + 28, perspective: 900 }}
      >
        <motion.div className="relative [transform-style:preserve-3d]" style={{ width: faceWidth, height: faceHeight, transform }}>
          {pages.map((page, i) => {
            const current = page.spreadIndex === currentSpread;
            return (
              <button
                key={page.key}
                type="button"
                aria-label={page.label}
                aria-current={current ? "true" : undefined}
                onFocus={() => turnTo(i)}
                onClick={() => !dragged.current && onPick(page)}
                className={
                  "absolute inset-0 overflow-hidden rounded-md bg-white shadow-md outline-none [backface-visibility:hidden] focus-visible:ring-4 focus-visible:ring-brand-orange/50 " +
                  (current ? "ring-2 ring-brand-orange" : "ring-1 ring-ink/10")
                }
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
              >
                <span aria-hidden className="pointer-events-none block">
                  <BookPage book={book} page={page.ref} opts={opts} />
                </span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </nav>
  );
}
