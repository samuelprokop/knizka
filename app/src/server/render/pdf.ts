/*
  PDF z HTML knihy cez headless Chrome (puppeteer-core + Chrome nainštalovaný
  v systéme, cesta v CHROME_PATH). Chrome nemá prístup na sieť – dokument,
  písma aj obrázky mu podáva renderer cez zachytenie požiadaviek.

  Po vykreslení pdf-lib doplní metadáta a strojovo čiteľné označenie AI (S7)
  a pri tlači TrimBox/BleedBox.

  CMYK / PDF/X: Chrome vytvára RGB PDF. Tlačové PDF je zatiaľ RGB s rámcami
  pre tlač; prevod do PDF/X-4 s profilom tlačiarne (napr. Ghostscript
  -dPDFX -sColorConversionStrategy=CMYK + ICC profil z konfigurácie trhu) sa
  doplní ako krok za touto funkciou, keď bude profil tlačiarne známy.
*/

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import puppeteer, { type Browser } from "puppeteer-core";

import type { Book } from "@/features/book/model/types";
import { buildPdfLayout, RENDER_ORIGIN, withRenderImages, type PdfKind, type PdfLayout } from "./html";

/** Načítanie obrázka z úložiska – dodáva volajúci (Next: storage, test: vzorové obrázky). */
export type AssetLoader = (key: string) => Promise<{ body: Buffer; contentType: string }>;

const DEFAULT_CHROME: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/chromium",
};

const PUBLIC_DIR = path.join(process.cwd(), "public");

const g = globalThis as unknown as { renderBrowser?: Promise<Browser> };

function browser(): Promise<Browser> {
  if (!g.renderBrowser) {
    const executablePath = process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform];
    if (!executablePath) throw new Error("Nastavte CHROME_PATH (cesta k Chrome/Chromium pre PDF).");
    g.renderBrowser = puppeteer.launch({ executablePath, headless: true, args: ["--font-render-hinting=none"] });
    g.renderBrowser.catch(() => (g.renderBrowser = undefined));
  }
  return g.renderBrowser;
}

export async function closeRenderBrowser() {
  const current = g.renderBrowser;
  g.renderBrowser = undefined;
  if (current) await (await current).close();
}

const FONT_TYPES: Record<string, string> = { ".woff2": "font/woff2", ".woff": "font/woff" };

/**
 * Otvorí HTML v Chrome s obsluhou zdrojov a zavolá `callback` nad stránkou.
 * Používa ho renderer PDF aj test sadzby (meranie pretečenia).
 */
export async function withRenderPage<T>(
  html: string,
  viewport: { widthMm: number; heightMm: number },
  loadAsset: AssetLoader,
  callback: (page: import("puppeteer-core").Page) => Promise<T>
): Promise<T> {
  const page = await (await browser()).newPage();
  try {
    await page.setViewport({
      width: Math.ceil((viewport.widthMm / 25.4) * 96),
      height: Math.ceil((viewport.heightMm / 25.4) * 96),
    });
    await page.setRequestInterception(true);
    page.on("request", async (request) => {
      try {
        const url = new URL(request.url());
        if (url.origin !== RENDER_ORIGIN) return void request.abort();
        if (url.pathname === "/") {
          return void request.respond({ status: 200, contentType: "text/html; charset=utf-8", body: html });
        }
        if (url.pathname.startsWith("/fonts/book/")) {
          const file = path.join(PUBLIC_DIR, path.normalize(url.pathname));
          if (!file.startsWith(path.join(PUBLIC_DIR, "fonts", "book"))) return void request.abort();
          const body = await readFile(file);
          return void request.respond({ status: 200, contentType: FONT_TYPES[path.extname(file)] ?? "font/woff2", body });
        }
        if (url.pathname.startsWith("/storage/")) {
          const key = decodeURIComponent(url.pathname.slice("/storage/".length));
          const asset = await loadAsset(key);
          return void request.respond({ status: 200, contentType: asset.contentType, body: asset.body });
        }
        request.abort();
      } catch {
        request.abort();
      }
    });
    await page.goto(`${RENDER_ORIGIN}/`, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
    });
    return await callback(page);
  } finally {
    await page.close();
  }
}

const PT_PER_MM = 72 / 25.4;

export type RenderedPdf = { bytes: Uint8Array; layout: PdfLayout };

export async function renderBookPdf(book: Book, kind: PdfKind, loadAsset: AssetLoader): Promise<RenderedPdf> {
  const layout = buildPdfLayout(withRenderImages(book), kind);
  const raw = await withRenderPage(layout.html, layout, loadAsset, (page) =>
    page.pdf({
      width: `${layout.widthMm}mm`,
      height: `${layout.heightMm}mm`,
      printBackground: true,
      preferCSSPageSize: true,
      tagged: kind === "ebook" || kind === "worksheets",
    })
  );
  const bytes = await finalizePdf(raw, book, kind, layout);
  return { bytes, layout };
}

/** Metadáta, označenie AI obsahu (S7) a tlačové rámce. */
async function finalizePdf(raw: Uint8Array, book: Book, kind: PdfKind, layout: PdfLayout) {
  const doc = await PDFDocument.load(raw);
  const now = new Date();
  const subject =
    kind === "ebook"
      ? "E-kniha"
      : kind === "worksheets"
        ? "Pracovné listy"
        : kind === "print-interior" ? "Tlačové PDF – vnútro" : "Tlačové PDF – obálka";
  const keywords = ["personalizovaná kniha", "AI-generated illustrations", "trainedAlgorithmicMedia"];
  if (book.meta.orderRef) keywords.push(book.meta.orderRef);

  doc.setTitle(book.meta.title, { showInWindowTitleBar: true });
  doc.setAuthor("TAKTIK vydavateľstvo, s.r.o.");
  doc.setSubject(subject);
  doc.setKeywords(keywords);
  doc.setCreator("TAKTIK – renderer kníh");
  doc.setProducer("TAKTIK – renderer kníh (Chrome, pdf-lib)");
  doc.setLanguage(book.meta.language);
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  // Strojovo čiteľné označenie: IPTC DigitalSourceType pre obsah vytvorený AI.
  const xmp = aiXmp(book, subject, now);
  // Bajty v UTF-8 – reťazec by pdf-lib zapísal po znakoch a diakritika by sa rozbila.
  const stream = doc.context.stream(new TextEncoder().encode(xmp), { Type: "Metadata", Subtype: "XML" });
  doc.catalog.set(PDFName.of("Metadata"), doc.context.register(stream));
  doc.catalog.set(PDFName.of("Lang"), PDFString.of(book.meta.language));

  if (layout.trim && layout.bleed) {
    const box = (b: NonNullable<PdfLayout["trim"]>) => ({
      x: b.x * PT_PER_MM,
      y: (layout.heightMm - b.y - b.height) * PT_PER_MM,
      width: b.width * PT_PER_MM,
      height: b.height * PT_PER_MM,
    });
    const trim = box(layout.trim);
    const bleed = box(layout.bleed);
    for (const page of doc.getPages()) {
      page.setTrimBox(trim.x, trim.y, trim.width, trim.height);
      page.setBleedBox(bleed.x, bleed.y, bleed.width, bleed.height);
    }
  }
  return doc.save({ useObjectStreams: kind === "ebook" || kind === "worksheets" });
}

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function aiXmp(book: Book, subject: string, date: Date) {
  const title = xmlEscape(book.meta.title);
  const iso = date.toISOString();
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(subject)}. Ilustrácie vytvorila umelá inteligencia; knihu skontroloval človek.</rdf:li></rdf:Alt></dc:description>
   <dc:creator><rdf:Seq><rdf:li>TAKTIK vydavateľstvo, s.r.o.</rdf:li></rdf:Seq></dc:creator>
   <dc:language><rdf:Bag><rdf:li>${book.meta.language}</rdf:li></rdf:Bag></dc:language>
   <xmp:CreateDate>${iso}</xmp:CreateDate>
   <xmp:CreatorTool>TAKTIK – renderer kníh</xmp:CreatorTool>
   <pdf:Keywords>AI-generated illustrations; trainedAlgorithmicMedia</pdf:Keywords>
   <Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
