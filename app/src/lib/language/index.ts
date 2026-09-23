/*
  Jazykový modul – verejné rozhranie (použiteľné aj v klientských komponentoch).

  Len server (import priamo z podmodulu):
    "@/lib/language/resolve"            resolveName, needsNameReview, getNameDay (J1, J4, J8)
    "@/lib/language/review"             fronta jazykovej kontroly (J4)
    "@/lib/language/hyphenation/server" delenie slov pre sadzbu (J7; české vzory sú GPL)
*/

export * from "./types";
export { guessNameForms } from "./rules";
export { applyTypography, renderNameTokens, usesInflectedName } from "./render";
export { findProfanity, moderateName, moderateText, normalizeForModeration, type ModerationResult } from "./moderation";
export {
  testHeroes,
  validateEditionTemplate,
  type EditionTemplate,
  type TemplateIssue,
  type TestHero,
  type TypesetSample,
} from "./validate";
