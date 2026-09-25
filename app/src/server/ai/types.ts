/*
  Vrstva poskytovateľa AI je vymeniteľná pre obrázky aj text (I1): jednotné
  rozhranie, adaptéry sa volia konfiguráciou (AI_IMAGE_PROVIDER, AI_TEXT_PROVIDER).
  Kým firma nedodá prístupy, beží adaptér "mock".

  Pravidlá (S13, S3): do textového modelu nikdy fotka ani priezvisko;
  každé volanie sa loguje do tabuľky ai_jobs (I2).
*/

import type { BookLanguage } from "@/i18n/locales";
import type { StyleId } from "@/config/catalog";

export type GeneratedImage = {
  /** Kľúč v úložisku, kam adaptér obrázok uložil. */
  storageKey: string;
  width: number;
  height: number;
};

export type CallMeta = {
  provider: string;
  model: string;
  costMicroUsd?: number;
};

export type CharacterPortraitRequest = {
  /** Kľúče fotiek v úložisku (len pri ceste s fotkou). */
  photoKeys: string[];
  /** Opis vzhľadu (cesta bez fotky alebo úpravy z Karty). */
  appearance: Record<string, unknown>;
  age?: number;
  style: StyleId;
  /** Pregenerovanie: čo zákazníkovi nesedelo (vybrané dôvody + vlastné slová, max. 200 znakov). */
  feedback?: { reasons: string[]; note?: string };
};

export type SceneRequest = {
  style: StyleId;
  /** Opis scény od redaktora alebo AI – bez textu v obrázku. */
  scene: string;
  /** Karty postáv, ktoré majú byť v scéne (kľúče obrázkov Kariet). */
  characterCardKeys: string[];
  aspect: "1:1" | "2:1";
};

export interface ImageProvider {
  readonly id: string;
  /** Portréty vo štýle (krok 3) – 1 obrázok. */
  portrait(req: CharacterPortraitRequest): Promise<{ image: GeneratedImage; meta: CallMeta }>;
  /** Karta postavy: portrét, celá postava, 2 výrazy. */
  characterCard(
    req: CharacterPortraitRequest
  ): Promise<{ images: Record<"portrait" | "fullBody" | "smile" | "surprise", GeneratedImage>; meta: CallMeta }>;
  /** Ilustrácia dvojstrany. */
  scene(req: SceneRequest): Promise<{ image: GeneratedImage; meta: CallMeta }>;
}

export type StoryBrief = {
  language: BookLanguage;
  /** Len krstné meno, vek, rod a odpovede sprievodcu – nič viac (S13). */
  heroFirstName: string;
  age: number;
  gender: "girl" | "boy";
  answers: Record<string, unknown>;
  spreads: 12 | 16;
};

export type StoryIdea = { title: string; summary: string };

export type GeneratedStory = {
  title: string;
  annotation: string;
  /** Text dvojstrán so značkami {meno:X} – tvar doplní jazykový modul (J11). */
  spreads: { text: string; scene: string }[];
  bible: { characters: string[]; places: string[] };
  moral: string;
  questions: string[];
};

export interface TextProvider {
  readonly id: string;
  /** Cesta C: 3 námety do 20 sekúnd. */
  storyIdeas(brief: StoryBrief): Promise<{ ideas: StoryIdea[]; meta: CallMeta }>;
  /** Cesta C/D: celý text v štruktúre knihy do 60 sekúnd. */
  writeStory(brief: StoryBrief, idea: StoryIdea | { ownText: string }): Promise<{ story: GeneratedStory; meta: CallMeta }>;
  /** Prepísanie jednej dvojstrany s pokynom (najviac 5×). */
  rewriteSpread(text: string, instruction: string, language: BookLanguage): Promise<{ text: string; meta: CallMeta }>;
}
