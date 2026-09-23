/*
  Ukážková dvojstrana pre krok 6 konfigurátora (K6.1, proces: Krok 6).

  Rozhranie pre balík A:
    - dáta pripraví server: getSampleSpreadData() z "@/features/book/server/sample"
      (text prvej dvojstrany s menom, ilustrácie 1:1 a 2:1 z mock adaptéra),
    - zmena layoutu, témy, písma, formátu či rámikov je len zmena props →
      prekreslí sa okamžite, bez generovania.

  Komponent nemá serverové importy ani stav, dá sa použiť v Server aj Client Component.
*/

import type { BookFormat, LayoutId } from "@/config/catalog";
import { LAYOUT_IMAGE_RATIO } from "@/config/catalog";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";

import { DEFAULT_FONT_FOR_LAYOUT, LAYOUT_SPECS, type FontPairId, type TextZone, type ThemeId } from "../design";
import { textFits } from "../model/limits";
import { defaultBookOptions } from "../model/options";
import { splitText } from "../model/text";
import type { Book, StorySpreadPart } from "../model/types";
import { BookSpread } from "./BookSpread";

/** Dáta ukážky zo servera (serializovateľné – dajú sa poslať do klientskeho komponentu). */
export type SampleSpreadData = {
  language: BookLanguage;
  /** Text prvej dvojstrany s dosadeným menom a typografiou. */
  text: string;
  /** Podpísané URL ilustrácie v pomere 1:1 a 2:1 (panoramatický layout). */
  illustrations: { square: string | null; wide: string | null };
  /** Pokojná zóna scény pre panoramatický layout. */
  textZone: TextZone;
};

export type SampleSpreadProps = {
  data: SampleSpreadData;
  layout: LayoutId;
  format: BookFormat;
  theme: ThemeId;
  /** Predvolené podľa layoutu. */
  fontPair?: FontPairId;
  frames?: boolean;
  /** Text vodoznaku (jazyk rozhrania), napr. t("book.preview.watermark"). */
  watermark?: string;
  className?: string;
};

/** Či sa text ukážky zmestí do layoutu – pri „prvom čítaní“ ponúknuť zmenu úrovne (proces: Krok 6). */
export const sampleTextFits = (data: SampleSpreadData, layout: LayoutId, format: BookFormat) =>
  textFits(data.text, layout, format);

export function SampleSpread({ data, layout, format, theme, fontPair, frames = false, watermark, className }: SampleSpreadProps) {
  const t = createTranslator(data.language);
  const src = LAYOUT_IMAGE_RATIO[layout] === "2:1" ? data.illustrations.wide : data.illustrations.square;

  const part: StorySpreadPart = {
    kind: "story_spread",
    spread: 0,
    layout,
    text: data.text,
    textZone: data.textZone,
    illustration: src ? { key: "sample", src } : null,
  };
  if (LAYOUT_SPECS[layout].splitText) part.textParts = splitText(data.text);

  const book: Book = {
    meta: {
      language: data.language,
      title: "",
      heroName: "",
      personalPageUrl: "",
      date: "",
      alt: {
        illustration: t("book.alt.illustration"),
        hero: t("book.alt.hero"),
        qr: t("book.alt.qr"),
        missing: t("book.preview.illustration_missing"),
      },
    },
    options: {
      ...defaultBookOptions({ age: 5, style: "watercolor", format, layout }),
      theme,
      fontPair: fontPair ?? DEFAULT_FONT_FOR_LAYOUT[layout],
      frames,
    },
    cover: { title: "", annotation: "", hero: null, portrait: null, scene: null },
    back: { text: "", portrait: null },
    parts: [part],
  };

  return (
    <BookSpread
      book={book}
      className={className}
      spread={{
        id: "sample",
        left: { type: "interior", page: { number: 2, partIndex: 0, side: "left" } },
        right: { type: "interior", page: { number: 3, partIndex: 0, side: "right" } },
      }}
      opts={{ watermark }}
    />
  );
}
