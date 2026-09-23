/*
  Kategórie príbehov – zdieľané medzi serverom a klientom, preto mimo
  server/stories.ts (ten je "server-only" a nesmie sa importovať do klienta).
  Zoznam zodpovedá kľúčom story.category.* v i18n správach zákazníckeho konfigurátora.
*/

export const STORY_CATEGORIES = ["adventure", "emotions", "holidays", "learning", "milestones"] as const;
export type StoryCategory = (typeof STORY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  adventure: "Dobrodružstvo",
  emotions: "Emócie a kamaráti",
  holidays: "Sviatky a oslavy",
  learning: "Učenie hrou",
  milestones: "Veľké dni",
};
