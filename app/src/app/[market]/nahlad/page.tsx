import type { Metadata } from "next";

import { BOOK_FORMATS, COVER_DESIGNS, LAYOUTS, PAGE_COUNTS, STYLES } from "@/config/catalog";
import { BookFlipbook } from "@/features/book/components/BookFlipbook";
import { SampleSpread } from "@/features/book/components/SampleSpread";
import { ENDPAPERS, FONT_PAIRS, THEMES, TITLE_POSITIONS } from "@/features/book/design";
import { sampleSpreads } from "@/features/book/fixtures/sample-story";
import { buildDemoBook, parseDemoParams } from "@/features/book/server/demo";
import { withSignedImages } from "@/features/book/server/media";
import { getSampleSpreadData } from "@/features/book/server/sample";
import type { MessageKey } from "@/i18n/messages";
import { BOOK_LANGUAGES } from "@/i18n/locales";
import { getMarketContext } from "@/i18n/server";

/*
  Vývojový náhľad renderera (balík C): listovací náhľad, ukážková dvojstrana
  vo všetkých layoutoch a stiahnutie PDF. Voľby idú v URL, takže sa dá zdieľať
  konkrétna kombinácia (napr. ?meno=Konštantínko&layout=panoramic&format=A4).
*/

export const metadata: Metadata = { robots: { index: false } };

export default async function PreviewDemoPage({ searchParams }: PageProps<"/[market]/nahlad">) {
  const { market, t } = await getMarketContext();
  const params = parseDemoParams(await searchParams);
  const { book, name } = await buildDemoBook(market.code, params);
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([k, v]) => [k, String(v)])
  );

  const sample = name
    ? await getSampleSpreadData({
        market: market.code,
        language: book.meta.language,
        name,
        spread: sampleSpreads(book.meta.language, 12)[0],
        style: book.options.style,
      })
    : null;

  const select = <T extends string | number>(
    name: string,
    label: string,
    values: readonly T[],
    current: T | undefined,
    optionLabel: (value: T) => string = String
  ) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink/80">
      {label}
      <select
        name={name}
        defaultValue={current === undefined ? "" : String(current)}
        className="h-11 rounded-lg border border-ink/15 bg-white px-3 text-ink"
      >
        {current === undefined && <option value="">–</option>}
        {values.map((value) => (
          <option key={value} value={value}>
            {optionLabel(value)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-extrabold text-ink">{t("book.demo.title")}</h1>
        <p className="max-w-2xl text-ink/70">{t("book.demo.intro")}</p>
      </header>

      <form className="grid grid-cols-2 gap-4 rounded-2xl bg-paper p-4 sm:grid-cols-4 lg:grid-cols-6" method="get">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink/80">
          {t("child.name.label")}
          <input
            name="meno"
            defaultValue={params.meno}
            minLength={2}
            maxLength={12}
            className="h-11 rounded-lg border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        {select("rod", t("child.gender.label"), ["girl", "boy"] as const, params.rod, (g) => t(`child.gender.${g}`))}
        {select("vek", t("child.age.label"), [3, 4, 5, 6, 7, 8] as const, params.vek)}
        {select("jazyk", t("child.language.label"), BOOK_LANGUAGES, book.meta.language, (l) => t(`book.demo.lang.${l}`))}
        {select("styl", t("book.demo.style"), STYLES, params.styl, (s) => t(`style.${s}` as MessageKey))}
        {select("layout", t("book.demo.layout"), LAYOUTS, book.options.layout, (l) => t(`layout.${l === "panoramic" ? "panorama" : l}` as MessageKey))}
        {select("format", t("book.demo.format"), BOOK_FORMATS, params.format, (f) => t(`book.format.${f}`))}
        {select("strany", t("book.pages"), PAGE_COUNTS, params.strany)}
        {select("obalka", t("cover.design"), COVER_DESIGNS, params.obalka, (c) => t(`book.cover.${c}`))}
        {select("nazov", t("cover.title_position"), TITLE_POSITIONS, book.options.titlePosition, (p) => t(`book.title_position.${p}`))}
        {select("tema", t("cover.theme"), THEMES, book.options.theme, (x) => t(`book.theme.${x}`))}
        {select("pismo", t("cover.font"), FONT_PAIRS, book.options.fontPair, (f) => t(`book.font.${f}`))}
        {select("predsadka", t("cover.endpapers"), ENDPAPERS, params.predsadka, (e) => t(`book.endpaper.${e}`))}
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-ink/80">
          <input type="checkbox" name="ramiky" value="1" defaultChecked={book.options.frames} className="size-5" />
          {t("cover.frames")}
        </label>
        <button
          type="submit"
          className="col-span-2 h-11 self-end rounded-full bg-brand-orange-dark px-6 font-semibold text-white sm:col-span-1"
        >
          {t("book.demo.apply")}
        </button>
      </form>

      <BookFlipbook book={withSignedImages(book, market.code)} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold text-ink">{t("book.demo.downloads")}</h2>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["ebook", "book.demo.pdf.ebook"],
              ["print-interior", "book.demo.pdf.print_interior"],
              ["print-cover", "book.demo.pdf.print_cover"],
            ] as const
          ).map(([kind, label]) => (
            <a
              key={kind}
              href={`/${market.code}/nahlad/pdf?${query}&druh=${kind}`}
              className="inline-flex h-11 items-center rounded-full border border-ink/20 bg-white px-5 text-sm font-semibold text-ink hover:border-ink/40"
            >
              {t(label)} (PDF)
            </a>
          ))}
        </div>
      </section>

      {sample && (
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-xl font-bold text-ink">{t("book.demo.samples")}</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          {LAYOUTS.map((layout) => (
            <figure key={layout} className="flex flex-col gap-2">
              <SampleSpread
                data={sample}
                layout={layout}
                format={book.options.format}
                theme={book.options.theme}
                frames={book.options.frames}
                watermark={t("book.preview.watermark")}
                className="shadow-lg"
              />
              <figcaption className="text-sm text-ink/70">
                <strong className="text-ink">{t(`layout.${layout === "panoramic" ? "panorama" : layout}` as MessageKey)}</strong>
                {" – "}
                {t(`layout.${layout === "panoramic" ? "panorama" : layout}.help` as MessageKey)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      )}
    </main>
  );
}
