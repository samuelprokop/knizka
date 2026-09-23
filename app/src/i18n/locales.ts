/*
  Jazyky kníh a rozhrania. Jazyk knihy sa volí nezávisle od trhu (K1.4).
  Kódy sú ISO 639-1 (čeština = "cs", nie "cz" – "cz" je kód trhu/krajiny).
*/

export const BOOK_LANGUAGES = ["sk", "cs"] as const;
export type BookLanguage = (typeof BOOK_LANGUAGES)[number];

export const isBookLanguage = (value: string): value is BookLanguage =>
  (BOOK_LANGUAGES as readonly string[]).includes(value);
