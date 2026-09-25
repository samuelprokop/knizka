/*
  HTML dokument knihy pre PDF – tie isté komponenty ako náhľad (BookPage),
  len vo fyzických rozmeroch (mm) a pri tlači so spadávkou a orezovými značkami.

  Bez "server-only": beží aj v teste sadzby (tsx) mimo Next.js.
*/

import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BookPage } from "@/features/book/components/BookPage";
import { FORMAT_SPECS, PRINT, spineWidthMm } from "@/features/book/design";
import { ebookPages, interiorPages, worksheetPages } from "@/features/book/model/pages";
import { bookCssVars } from "@/features/book/components/primitives";
import type { Book, BookImage, PageRef } from "@/features/book/model/types";

import type { PdfKind } from "./types";

export type { PdfKind };

/** Pôvod, z ktorého Chrome načíta dokument; požiadavky obsluhuje renderer (žiadna sieť). */
export const RENDER_ORIGIN = "http://book.local";

const STYLE_DIR = path.join(process.cwd(), "src/features/book/styles");

let cachedCss: string | null = null;
function bookCss() {
  cachedCss ??= ["fonts.css", "book.css"].map((f) => readFileSync(path.join(STYLE_DIR, f), "utf8")).join("\n");
  return cachedCss;
}

/** Obrázky knihy ako URL renderera – súbory dodá AssetLoader, nie verejná sieť. */
export function withRenderImages(book: Book): Book {
  const resolve = (image: BookImage | null): BookImage | null =>
    image ? { ...image, src: `${RENDER_ORIGIN}/storage/${encodeURIComponent(image.key)}` } : null;
  return {
    ...book,
    cover: {
      ...book.cover,
      hero: resolve(book.cover.hero),
      portrait: resolve(book.cover.portrait),
      scene: resolve(book.cover.scene),
    },
    back: { ...book.back, portrait: resolve(book.back.portrait) },
    parts: book.parts.map((part) =>
      part.kind === "story_spread" ? { ...part, illustration: resolve(part.illustration) } : part
    ),
  };
}

export type PdfLayout = {
  html: string;
  /** Rozmer strany PDF (vrátane spadávky a okraja na značky pri tlači). */
  widthMm: number;
  heightMm: number;
  pageCount: number;
  /** Orezový a spadávkový rámec (mm od ľavého dolného rohu) – TrimBox/BleedBox v PDF. */
  trim?: { x: number; y: number; width: number; height: number };
  bleed?: { x: number; y: number; width: number; height: number };
};

const mm = (value: number) => `${value}mm`;

function documentHtml(body: ReactNode, widthMm: number, heightMm: number, lang: string) {
  const markup = renderToStaticMarkup(<>{body}</>);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style>
${bookCss()}
@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.pdf-sheet { position: relative; width: ${widthMm}mm; height: ${heightMm}mm; overflow: hidden; break-after: page; }
.pdf-sheet:last-child { break-after: auto; }
.pdf-clip { position: absolute; overflow: hidden; }
.pdf-marks { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.pdf-slug { position: absolute; font: 7pt/1 sans-serif; color: #000; white-space: nowrap; }
.pdf-spine { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.pdf-spine span { transform: rotate(90deg); white-space: nowrap; }
</style>
</head>
<body>${markup}</body>
</html>`;
}

/** Orezové značky v rohoch orezového rámca (a voliteľne značky ohybu chrbta). */
function CropMarks({
  sheetW,
  sheetH,
  trimX,
  trimY,
  trimW,
  trimH,
  folds = [],
  bleed = PRINT.bleedMm,
}: {
  sheetW: number;
  sheetH: number;
  trimX: number;
  trimY: number;
  trimW: number;
  trimH: number;
  folds?: number[];
  /** Presah za orezom – značky musia byť až za ním. */
  bleed?: number;
}) {
  const gap = bleed + 1;
  const len = PRINT.cropMarkLengthMm;
  const lines: [number, number, number, number][] = [];
  for (const x of [trimX, trimX + trimW]) {
    lines.push([x, trimY - gap - len, x, trimY - gap]);
    lines.push([x, trimY + trimH + gap, x, trimY + trimH + gap + len]);
  }
  for (const y of [trimY, trimY + trimH]) {
    lines.push([trimX - gap - len, y, trimX - gap, y]);
    lines.push([trimX + trimW + gap, y, trimX + trimW + gap + len, y]);
  }
  for (const x of folds) {
    lines.push([x, trimY - gap - len, x, trimY - gap]);
    lines.push([x, trimY + trimH + gap, x, trimY + trimH + gap + len]);
  }
  return (
    <svg className="pdf-marks" viewBox={`0 0 ${sheetW} ${sheetH}`}>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth="0.1" />
      ))}
    </svg>
  );
}

/** Strana v rozmere orezu umiestnená v hárku (ľavý horný roh orezu = x, y). */
function PlacedPage({ book, page, x, y, bleedMm }: { book: Book; page: PageRef; x: number; y: number; bleedMm?: number }) {
  const format = FORMAT_SPECS[book.options.format];
  return (
    <div style={{ position: "absolute", left: mm(x), top: mm(y), width: mm(format.widthMm) }}>
      <BookPage book={book} page={page} opts={{ bleedMm }} />
    </div>
  );
}

/**
 * Tie isté strany ako e-kniha, ale v šírke obrazovky (px) – na porovnanie náhľadu
 * s PDF v teste sadzby. Poradie strán = ebookPages = dvojstrany náhľadu za sebou.
 */
export function buildScreenHtml(book: Book, pageWidthPx: number, opts: { watermark?: string } = {}) {
  const body = ebookPages(book).map((page, i) => (
    <div key={i} style={{ width: `${pageWidthPx}px`, marginBottom: "8px" }}>
      <BookPage book={book} page={page} opts={opts} />
    </div>
  ));
  const format = FORMAT_SPECS[book.options.format];
  return documentHtml(body, format.widthMm, format.heightMm, book.meta.language);
}

export function buildPdfLayout(bookWithImages: Book, kind: PdfKind): PdfLayout {
  const book = bookWithImages;
  const format = FORMAT_SPECS[book.options.format];
  const W = format.widthMm;
  const H = format.heightMm;
  const lang = book.meta.language;

  if (kind === "ebook" || kind === "worksheets") {
    const pages = kind === "ebook" ? ebookPages(book) : worksheetPages(book);
    const body = pages.map((page, i) => (
      <section className="pdf-sheet" key={i}>
        <PlacedPage book={book} page={page} x={0} y={0} />
      </section>
    ));
    return { html: documentHtml(body, W, H, lang), widthMm: W, heightMm: H, pageCount: pages.length };
  }

  const b = PRINT.bleedMm;
  const s = PRINT.slugMm;

  if (kind === "print-interior") {
    const sheetW = W + 2 * (b + s);
    const sheetH = H + 2 * (b + s);
    const pages = interiorPages(book);
    const body = pages.map((page) => (
      <section className="pdf-sheet" key={page.number}>
        <div className="pdf-clip" style={{ left: mm(s), top: mm(s), width: mm(W + 2 * b), height: mm(H + 2 * b) }}>
          <PlacedPage book={book} page={{ type: "interior", page }} x={b} y={b} bleedMm={b} />
        </div>
        <CropMarks sheetW={sheetW} sheetH={sheetH} trimX={s + b} trimY={s + b} trimW={W} trimH={H} />
        <span className="pdf-slug" style={{ left: mm(s + b), top: mm(2) }}>
          {[book.meta.orderRef, `${book.options.format} · ${book.options.pageCount}`, String(page.number)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </section>
    ));
    return {
      html: documentHtml(body, sheetW, sheetH, lang),
      widthMm: sheetW,
      heightMm: sheetH,
      pageCount: pages.length,
      trim: { x: s + b, y: s + b, width: W, height: H },
      bleed: { x: s, y: s, width: W + 2 * b, height: H + 2 * b },
    };
  }

  // Obálka: zadná strana + chrbát + predná strana na jednom hárku, presah na zahnutie cez dosky.
  const wrap = PRINT.coverWrapMm[book.options.binding];
  const spine = spineWidthMm(book.options.pageCount, book.options.binding);
  const trimW = 2 * W + spine;
  const sheetW = trimW + 2 * (wrap + s);
  const sheetH = H + 2 * (wrap + s);
  const x0 = s + wrap;
  const y0 = s + wrap;
  const vars = bookCssVars(book.options);
  const body = (
    <section className="pdf-sheet">
      <div className="pdf-clip" style={{ left: mm(s), top: mm(s), width: mm(trimW + 2 * wrap), height: mm(H + 2 * wrap) }}>
        {/* Každá strana obálky orezaná na svoju polovicu, aby spadávka nezasahovala do chrbta. */}
        <div className="pdf-clip" style={{ left: 0, top: 0, width: mm(wrap + W), height: "100%" }}>
          <PlacedPage book={book} page={{ type: "back_cover" }} x={wrap} y={wrap} bleedMm={wrap} />
        </div>
        <div className="pdf-clip" style={{ left: mm(wrap + W + spine), top: 0, width: mm(W + wrap), height: "100%" }}>
          <PlacedPage book={book} page={{ type: "cover" }} x={0} y={wrap} bleedMm={wrap} />
        </div>
        <div
          className="pdf-spine"
          style={{
            ...vars,
            left: mm(wrap + W),
            width: mm(spine),
            top: 0,
            bottom: 0,
            background: "var(--bk-accent)",
            color: "var(--bk-on-accent)",
            fontFamily: "var(--bk-heading)",
            fontWeight: "var(--bk-heading-weight)" as unknown as number,
            fontSize: mm(Math.min(spine * 0.55, 6)),
          }}
        >
          {spine >= 5 && <span>{book.meta.title}</span>}
        </div>
      </div>
      <CropMarks sheetW={sheetW} sheetH={sheetH} trimX={x0} trimY={y0} trimW={trimW} trimH={H} folds={[x0 + W, x0 + W + spine]} bleed={wrap} />
      <span className="pdf-slug" style={{ left: mm(x0), top: mm(2) }}>
        {[book.meta.orderRef, `${book.options.format} · ${book.options.binding} · ${spine} mm`].filter(Boolean).join(" · ")}
      </span>
    </section>
  );
  return {
    html: documentHtml(body, sheetW, sheetH, lang),
    widthMm: sheetW,
    heightMm: sheetH,
    pageCount: 1,
    trim: { x: x0, y: y0, width: trimW, height: H },
    bleed: { x: s, y: s, width: trimW + 2 * wrap, height: H + 2 * wrap },
  };
}
