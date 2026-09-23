/*
  Kalibrácia limitov znakov layoutov: binárnym hľadaním v Chrome zistí, koľko
  znakov sa reálne zmestí do dvojstrany každého layoutu a formátu, a navrhne
  limit s rezervou (LAYOUT_SPECS.maxChars v src/features/book/design.ts).

    npx tsx scripts/calibrate-layouts.ts
  Spustiť po zmene písma, veľkosti textu alebo rámov; potom npm run test:render.
*/

import { BOOK_FORMATS, LAYOUTS } from "../src/config/catalog";
import { LAYOUT_SPECS } from "../src/features/book/design";
import { sampleBookInput } from "../src/features/book/fixtures/sample-book";
import { buildBook } from "../src/features/book/model/build";
import { buildPdfLayout, withRenderImages } from "../src/server/render/html";
import { closeRenderBrowser, withRenderPage, type AssetLoader } from "../src/server/render/pdf";

const RESERVE = 0.85;
const WORDS =
  "Konštantínko s kamarátkou Maximiliánkou objavovali záhradu plnú rozprávkových prekvapení a smiali sa každému dobrodružstvu".split(" ");

const loadAsset: AssetLoader = async () => ({
  contentType: "image/svg+xml",
  body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
});

function textOfLength(n: number) {
  let text = "";
  for (let i = 0; text.length < n; i++) text += (text ? " " : "") + WORDS[i % WORDS.length];
  return text.slice(0, n).trimEnd();
}

async function fits(layout: (typeof LAYOUTS)[number], format: (typeof BOOK_FORMATS)[number], length: number) {
  const input = sampleBookInput({ layout, format });
  const text = textOfLength(length);
  input.story = { ...input.story, spreads: input.story.spreads.map(() => ({ text })) };
  const pdf = buildPdfLayout(withRenderImages(buildBook(input)), "ebook");
  return withRenderPage(pdf.html, pdf, loadAsset, (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".bk-fit")].every(
        (el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1
      )
    )
  );
}

async function main() {
  for (const layout of LAYOUTS) {
    for (const format of BOOK_FORMATS) {
      let lo = 20;
      let hi = 3000;
      while (hi - lo > 5) {
        const mid = Math.floor((lo + hi) / 2);
        if (await fits(layout, format, mid)) lo = mid;
        else hi = mid;
      }
      const suggested = Math.floor((lo * RESERVE) / 10) * 10;
      console.log(`${layout.padEnd(14)} ${format}  kapacita ≈ ${lo}  návrh ${suggested}  (teraz ${LAYOUT_SPECS[layout].maxChars[format]})`);
    }
  }
  await closeRenderBrowser();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
