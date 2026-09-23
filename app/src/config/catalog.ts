/*
  Katalóg možností prispôsobenia (špecifikácia: Katalóg možností prispôsobenia).
  Každá možnosť má predvolenú hodnotu. Zapínanie/vypínanie po trhoch príde
  s administráciou (balík E) – dovtedy platí tento zoznam pre všetky trhy.

  Texty (názvy možností) sú v i18n správach, tu sú len identifikátory.
*/

export const BOOK_FORMATS = ["A5", "A4"] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

export const BINDINGS = ["hardcover", "softcover"] as const;
export type Binding = (typeof BINDINGS)[number];

export const PAGE_COUNTS = [32, 40] as const;
export type PageCount = (typeof PAGE_COUNTS)[number];

/** 12 dvojstrán príbehu = 32 strán, 16 dvojstrán = 40 strán. */
export const SPREADS_FOR_PAGES: Record<PageCount, 12 | 16> = { 32: 12, 40: 16 };

export const STYLES = ["watercolor", "modern", "animated", "crayon"] as const;
export type StyleId = (typeof STYLES)[number];

export const LAYOUTS = ["classic", "panoramic", "picture", "first_reading"] as const;
export type LayoutId = (typeof LAYOUTS)[number];

/** Pomer obrázka určuje, či zmena layoutu vyžaduje nové generovanie (K6.4). */
export const LAYOUT_IMAGE_RATIO: Record<LayoutId, "1:1" | "2:1"> = {
  classic: "1:1",
  panoramic: "2:1",
  picture: "1:1",
  first_reading: "1:1",
};

export const COVER_DESIGNS = ["hero_big", "hero_in_scene", "ornament_frame", "minimal"] as const;
export type CoverDesign = (typeof COVER_DESIGNS)[number];

export const ACTIVITIES = [
  "trace_name",
  "find_letters",
  "count",
  "maze",
  "questions",
  "draw",
  "diploma",
] as const;
export type ActivityId = (typeof ACTIVITIES)[number];
export const ACTIVITY_PICK_COUNT = 4;

/** Cesty k príbehu: A hotový, B hotový s detailmi, C na mieru od AI, D vlastný. */
export const STORY_PATHS = ["A", "B", "C", "D"] as const;
export type StoryPath = (typeof STORY_PATHS)[number];

export const READING_LEVELS = ["A", "B", "C"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const GUIDE_KINDS = ["mascot", "animal", "none"] as const;
export type GuideKind = (typeof GUIDE_KINDS)[number];

export const GUIDE_ANIMALS = ["dog", "cat", "fox", "dragon", "bear", "rabbit"] as const;

export const CHARACTER_KINDS = [
  "sibling",
  "mother",
  "father",
  "grandmother",
  "grandfather",
  "friend",
  "pet",
  "other",
] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const MAX_EXTRA_CHARACTERS = 3;

/** Limity úprav – štartovacie hodnoty, neskôr nastaviteľné v administrácii podľa trhu. */
export const LIMITS = {
  heroCardRegenerations: 3,
  textAiRewrites: 5,
  illustrationEdits: 5,
  freePreviewsPer30Days: 3,
  customStoriesPer30Days: 2,
  photosPerCharacter: 3,
  ownStoryMaxChars: 1500,
  wishMaxChars: 300,
  dedicationMaxChars: 300,
  parentLetterMaxChars: 900,
  backCoverMaxChars: 400,
  nameMinChars: 2,
  nameMaxChars: 12,
} as const;

/** Predvolené hodnoty podľa veku (proces: „Predvolené všade“). */
export function defaultsForAge(age: number): {
  layout: LayoutId;
  readingLevel: ReadingLevel;
  activities: ActivityId[];
} {
  if (age <= 4) {
    return { layout: "picture", readingLevel: "A", activities: ["trace_name", "count", "draw", "diploma"] };
  }
  if (age <= 5) {
    return { layout: "classic", readingLevel: "A", activities: ["trace_name", "find_letters", "count", "draw"] };
  }
  if (age <= 6) {
    return { layout: "classic", readingLevel: "B", activities: ["find_letters", "count", "maze", "questions"] };
  }
  return { layout: "first_reading", readingLevel: "C", activities: ["find_letters", "maze", "questions", "diploma"] };
}
