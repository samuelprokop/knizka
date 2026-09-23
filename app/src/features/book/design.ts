/*
  Dizajnové stavebnice knihy (špecifikácia: Výtvarné štýly a layouty, Výstupy a výroba;
  proces: Krok 6). Všetko sú identifikátory a čísla – názvy pre zákazníka sú v i18n
  pod kľúčmi book.theme.*, book.font.*, book.endpaper.*, book.cover.*, book.title_position.*.

  Rozmery sú v milimetroch. Layout sa sádza v jednotkách strany (CSS premenná --mm),
  takže náhľad v prehliadači aj PDF majú rovnaké zalomenie riadkov.
*/

import type { BookFormat, Binding, CoverDesign, LayoutId, PageCount, StyleId } from "@/config/catalog";

// ---------------------------------------------------------------- formát a tlač

export type FormatSpec = { widthMm: number; heightMm: number; orientation: "portrait" | "landscape" };

/**
 * A4 na výšku a A5 naležato (špecifikácia: „A4 na výšku, 21 × 15 cm ležato“).
 * Obe majú šírku strany 210 mm, takže písmo má v oboch rovnakú veľkosť.
 */
export const FORMAT_SPECS: Record<BookFormat, FormatSpec> = {
  A4: { widthMm: 210, heightMm: 297, orientation: "portrait" },
  A5: { widthMm: 210, heightMm: 148, orientation: "landscape" },
};

/** Tlačové parametre (I3). PLACEHOLDER, kým nebude profil tlačiarne v konfigurácii trhu. */
export const PRINT = {
  dpi: 300,
  bleedMm: 3,
  /** Okraj mimo spadávky pre orezové značky a identifikátor objednávky. */
  slugMm: 10,
  cropMarkLengthMm: 6,
  /** Obálka pevnej väzby sa zahýna cez dosku – väčší presah ako spadávka. */
  coverWrapMm: { hardcover: 15, softcover: 3 } satisfies Record<Binding, number>,
  /** Hrúbka jedného listu papiera (2 strany) v mm – 150 g/m² matný. */
  paperLeafMm: 0.14,
  /** Prídavok na dosky a kĺb pri pevnej väzbe. */
  hardcoverBoardMm: 5,
} as const;

/** Šírka chrbta podľa rozsahu a väzby. PLACEHOLDER vzorec – presné čísla dodá tlačiareň. */
export function spineWidthMm(pageCount: PageCount, binding: Binding): number {
  const leaves = pageCount / 2;
  const block = leaves * PRINT.paperLeafMm;
  const extra = binding === "hardcover" ? PRINT.hardcoverBoardMm : 0.5;
  return Math.round((block + extra) * 10) / 10;
}

/** Potrebná veľkosť ilustrácie v px pre tlač (I3): strana + 2 × spadávka pri 300 dpi. */
export function printPixelSize(format: BookFormat, aspect: "1:1" | "2:1") {
  const spec = FORMAT_SPECS[format];
  const px = (mm: number) => Math.ceil(((mm + 2 * PRINT.bleedMm) / 25.4) * PRINT.dpi);
  const width = aspect === "2:1" ? px(spec.widthMm * 2) : px(spec.widthMm);
  return { width, height: px(spec.heightMm) };
}

// ---------------------------------------------------------------- farebné témy

export const THEMES = ["sunrise", "meadow", "ocean", "berry", "night", "sand"] as const;
export type ThemeId = (typeof THEMES)[number];

export type ThemeSpec = {
  /** Papier (pozadie textových strán). */
  paper: string;
  ink: string;
  accent: string;
  /** Jemná plocha – rámy, pozadie textového boxu. */
  soft: string;
  /** Kontrastný text na ploche accent (obálka). */
  onAccent: string;
};

export const THEME_SPECS: Record<ThemeId, ThemeSpec> = {
  sunrise: { paper: "#fffaf3", ink: "#2b2118", accent: "#e8611a", soft: "#ffe6d6", onAccent: "#ffffff" },
  meadow: { paper: "#f7fbf2", ink: "#1f2a1c", accent: "#3f7f31", soft: "#dcefd2", onAccent: "#ffffff" },
  ocean: { paper: "#f3f9fb", ink: "#14303a", accent: "#00807c", soft: "#cdeeed", onAccent: "#ffffff" },
  berry: { paper: "#fcf5f8", ink: "#33152a", accent: "#b23a70", soft: "#f6d7e5", onAccent: "#ffffff" },
  night: { paper: "#f4f3fb", ink: "#1c1a3a", accent: "#4f41a8", soft: "#dedaf5", onAccent: "#ffffff" },
  sand: { paper: "#fbf7ef", ink: "#3a2f22", accent: "#8f6414", soft: "#f1e4c6", onAccent: "#ffffff" },
};

/** Predvolená téma podľa štýlu (proces: „6 palát podľa štýlu“). */
export const DEFAULT_THEME_FOR_STYLE: Record<StyleId, ThemeId> = {
  watercolor: "meadow",
  modern: "sunrise",
  animated: "ocean",
  crayon: "sand",
};

// ---------------------------------------------------------------- písma

export const FONT_PAIRS = ["classic", "storybook", "playful", "reader"] as const;
export type FontPairId = (typeof FONT_PAIRS)[number];

export type FontPairSpec = { heading: string; headingWeight: number; body: string; bodyWeight: number };

/** Páry písiem (nadpis + text). Súbory sú v public/fonts/book (OFL), @font-face v styles/fonts.css. */
export const FONT_PAIR_SPECS: Record<FontPairId, FontPairSpec> = {
  classic: { heading: "'Literata', serif", headingWeight: 700, body: "'Literata', serif", bodyWeight: 400 },
  storybook: { heading: "'Fredoka', sans-serif", headingWeight: 600, body: "'Nunito', sans-serif", bodyWeight: 400 },
  playful: { heading: "'Baloo 2', sans-serif", headingWeight: 700, body: "'Nunito', sans-serif", bodyWeight: 400 },
  // Andika je navrhnutá pre začínajúcich čitateľov (jednopríbehové a, zreteľné I/l).
  reader: { heading: "'Andika', sans-serif", headingWeight: 700, body: "'Andika', sans-serif", bodyWeight: 400 },
};

/** Písmo na obkresľovanie mena – „písané“. PLACEHOLDER, kým nebude školské písmo podľa krajiny. */
export const HANDWRITING_FONT = "'Patrick Hand', cursive";

export const DEFAULT_FONT_FOR_LAYOUT: Record<LayoutId, FontPairId> = {
  classic: "classic",
  panoramic: "classic",
  picture: "storybook",
  first_reading: "reader",
};

// ---------------------------------------------------------------- obálka a predsádky

export const TITLE_POSITIONS = ["top", "bottom", "over"] as const;
export type TitlePosition = (typeof TITLE_POSITIONS)[number];

export const DEFAULT_TITLE_POSITION: Record<CoverDesign, TitlePosition> = {
  hero_big: "top",
  hero_in_scene: "bottom",
  ornament_frame: "top",
  minimal: "bottom",
};

export const ENDPAPERS = ["dots", "stars", "waves", "leaves", "hearts", "solid"] as const;
export type EndpaperId = (typeof ENDPAPERS)[number];

// ---------------------------------------------------------------- layouty

/** Pokojná zóna ilustrácie, kam sa pri panoramatickom layoute kladie text (I4). */
export const TEXT_ZONES = ["left-top", "left-bottom", "right-top", "right-bottom"] as const;
export type TextZone = (typeof TEXT_ZONES)[number];

export type LayoutSpec = {
  /** Veľkosť písma textu príbehu v mm (18 pt ≈ 6,4 mm, 24 pt ≈ 8,5 mm). */
  fontSizeMm: number;
  lineHeight: number;
  /** Najviac znakov textu dvojstrany (po dosadení mena) – kontroluje editor aj test sadzby. */
  maxChars: Record<BookFormat, number>;
  /** Text sa delí na ľavú a pravú stranu (obrázkový layout). */
  splitText: boolean;
};

/**
 * Limity znakov: ~85 % kapacity nameranej v Chrome (scripts/calibrate-layouts.ts),
 * pri panoráme nižšie, aby textový box nezakryl väčšinu ilustrácie, pri obrázkovom
 * tak, aby sa aj väčšia polovica deleného textu (najviac 65 %) zmestila na svoju stranu.
 * Dodržanie overuje npm run test:render; po zmene písma alebo rámov treba kalibráciu
 * aj test pustiť znova.
 * Vekové pravidlá (dĺžka viet pre úroveň A/B/C) sú redakčné, nie sadzobné – tu nie sú.
 */
export const LAYOUT_SPECS: Record<LayoutId, LayoutSpec> = {
  classic: { fontSizeMm: 6.4, lineHeight: 1.5, maxChars: { A4: 900, A5: 370 }, splitText: false },
  panoramic: { fontSizeMm: 5.6, lineHeight: 1.45, maxChars: { A4: 450, A5: 240 }, splitText: false },
  picture: { fontSizeMm: 6.8, lineHeight: 1.4, maxChars: { A4: 540, A5: 220 }, splitText: true },
  first_reading: { fontSizeMm: 8.4, lineHeight: 1.6, maxChars: { A4: 520, A5: 240 }, splitText: false },
};
