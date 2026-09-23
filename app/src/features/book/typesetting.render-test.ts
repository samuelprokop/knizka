/*
  Test sadzby v skutočnom prehliadači (Chrome cez puppeteer-core):
    npm run test:render
  Beží mimo `npm test`, lebo potrebuje nainštalovaný Chrome (CHROME_PATH).

  Overuje „Hotovo, keď“ balíka C:
  - vzorový príbeh sa vysadí vo všetkých 4 layoutoch, A4 aj A5, 32 aj 40 strán,
    s menom 2 aj 12 znakov (SK aj CZ) bez pretečenia textu,
  - limity znakov layoutov (LAYOUT_SPECS.maxChars) naozaj platia pre text dlhý presne na limit,
  - náhľad v prehliadači a PDF tej istej verzie sú obsahovo zhodné (a zalomenie riadkov
    nezávisí od mierky).
*/

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

import { BOOK_FORMATS, LAYOUTS, PAGE_COUNTS } from "@/config/catalog";
import { BOOK_LANGUAGES } from "@/i18n/locales";
import { buildPdfLayout, buildScreenHtml, withRenderImages } from "@/server/render/html";
import { closeRenderBrowser, renderBookPdf, withRenderPage, type AssetLoader } from "@/server/render/pdf";

import { LAYOUT_SPECS } from "./design";
import { guessedNameContext, sampleBookInput, TEST_NAMES } from "./fixtures/sample-book";
import { buildBook } from "./model/build";
import type { Book } from "./model/types";

const loadAsset: AssetLoader = async (key) => ({
  contentType: "image/svg+xml",
  body: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100%" height="100%" fill="#cde"/><text x="50%" y="50%" font-size="60" text-anchor="middle">${key}</text></svg>`
  ),
});

after(() => closeRenderBrowser());

type Overflow = { page: string; selector: string; text: string };

/** Nájde texty, ktoré sa nezmestili do rámu, a nadpisy obálky mimo strany. */
async function findOverflows(book: Book): Promise<Overflow[]> {
  const layout = buildPdfLayout(withRenderImages(book), "ebook");
  return withRenderPage(layout.html, layout, loadAsset, (page) =>
    page.evaluate(() => {
      const result: { page: string; selector: string; text: string }[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(".bk-fit")) {
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
          const page = el.closest<HTMLElement>(".bk-page")?.dataset.page ?? "?";
          result.push({ page, selector: ".bk-fit", text: el.innerText.slice(0, 60) });
        }
      }
      for (const el of document.querySelectorAll<HTMLElement>(".bk-cover-title, .bk-story-text")) {
        const pageEl = el.closest<HTMLElement>(".bk-page")!;
        const p = pageEl.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (r.top < p.top - 1 || r.bottom > p.bottom + 1 || r.left < p.left - 1 || r.right > p.right + 1) {
          result.push({ page: pageEl.dataset.page ?? "?", selector: "mimo strany", text: el.innerText.slice(0, 60) });
        }
      }
      return result;
    })
  );
}

describe("sadzba vzorového príbehu (Chrome)", { timeout: 600_000 }, () => {
  for (const language of BOOK_LANGUAGES)
    for (const layout of LAYOUTS)
      for (const format of BOOK_FORMATS)
        for (const pageCount of PAGE_COUNTS)
          it(`${language} · ${layout} · ${format} · ${pageCount} strán`, async () => {
            for (const { name, gender } of TEST_NAMES) {
              const input = sampleBookInput({
                language,
                layout,
                format,
                pageCount,
                name: guessedNameContext(name, gender, language),
              });
              // Všetky aktivity sa striedajú, aby každá prešla sadzbou v každom formáte.
              input.options.activities = name.length > 2
                ? ["trace_name", "find_letters", "count", "maze"]
                : ["questions", "draw", "diploma", "maze"];
              const overflows = await findOverflows(buildBook(input));
              assert.deepEqual(overflows, [], `meno ${name}`);
            }
          });
});

/** Text presne na limit – dlhšie slová, aby to bol horší prípad ako bežný príbeh. */
function textOfLength(n: number) {
  const words =
    "Konštantínko s kamarátkou Maximiliánkou objavovali záhradu plnú rozprávkových prekvapení a smiali sa každému dobrodružstvu".split(" ");
  let text = "";
  for (let i = 0; text.length < n; i++) text += (text ? " " : "") + words[i % words.length];
  return text.slice(0, n).trimEnd();
}

describe("limity znakov layoutov platia (Chrome)", { timeout: 600_000 }, () => {
  for (const layout of LAYOUTS)
    for (const format of BOOK_FORMATS)
      it(`${layout} · ${format}: ${LAYOUT_SPECS[layout].maxChars[format]} znakov sa zmestí`, async () => {
        const input = sampleBookInput({ layout, format });
        const text = textOfLength(LAYOUT_SPECS[layout].maxChars[format]);
        input.story = { ...input.story, spreads: input.story.spreads.map(() => ({ text })) };
        const overflows = (await findOverflows(buildBook(input))).filter((o) => o.text.startsWith("Konšt"));
        assert.deepEqual(overflows, []);
      });
});

describe("náhľad a PDF sú zhodné (Chrome)", { timeout: 600_000 }, () => {
  const book = buildBook(
    sampleBookInput({ layout: "classic", format: "A5", pageCount: 40, name: guessedNameContext("Maximiliánka", "girl", "sk") })
  );

  async function pageTexts(html: string, viewport: { widthMm: number; heightMm: number }) {
    return withRenderPage(html, viewport, loadAsset, (page) =>
      page.evaluate(() => {
        document.querySelectorAll(".bk-watermark").forEach((el) => el.remove());
        return [...document.querySelectorAll<HTMLElement>(".bk-page")].map((el) => ({
          text: el.innerText.replace(/\s+/g, " ").trim(),
          lines: [...el.querySelectorAll<HTMLElement>(".bk-story-text")].map((p) =>
            Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight))
          ),
        }));
      })
    );
  }

  it("rovnaké strany, texty a zalomenie riadkov pri 360 px aj v PDF (210 mm)", async () => {
    const withImages = withRenderImages(book);
    const pdf = buildPdfLayout(withImages, "ebook");
    const screen = buildScreenHtml(withImages, 360, { watermark: "NÁHĽAD" });
    const [fromPdf, fromScreen] = [await pageTexts(pdf.html, pdf), await pageTexts(screen, { widthMm: 120, heightMm: 300 })];
    assert.equal(fromPdf.length, 40 + 4);
    assert.deepEqual(fromScreen, fromPdf);
  });

  it("PDF má všetky strany, označenie AI (S7) a pri tlači TrimBox/BleedBox", async () => {
    const ebook = await PDFDocument.load((await renderBookPdf(book, "ebook", loadAsset)).bytes);
    assert.equal(ebook.getPageCount(), 44);
    const metadata = ebook.catalog.lookup(PDFName.of("Metadata"));
    assert.ok(metadata instanceof PDFRawStream, "chýba XMP");
    const xmp = new TextDecoder().decode(metadata.contents);
    assert.match(xmp, /compositeWithTrainedAlgorithmicMedia/);
    assert.match(xmp, new RegExp(book.meta.title), "XMP musí byť v UTF-8 (diakritika v názve)");
    assert.match(ebook.getKeywords() ?? "", /trainedAlgorithmicMedia/);

    const print = await PDFDocument.load((await renderBookPdf(book, "print-interior", loadAsset)).bytes);
    assert.equal(print.getPageCount(), 40);
    const first = print.getPage(0);
    const trim = first.getTrimBox();
    assert.ok(Math.abs(trim.width - (148 / 25.4) * 72 * (210 / 148)) < 1);
    assert.ok(first.getBleedBox().width > trim.width);
  });
});


