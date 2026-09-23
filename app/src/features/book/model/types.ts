/*
  Model knihy – jedna uzamknutá verzia, z ktorej sa renderuje náhľad, e-kniha
  aj tlačové PDF. Všetky texty sú už dosadené (meno, rod, typografia), takže
  komponenty layoutov len vykresľujú a nič neskloňujú.

  Štruktúra: obálka + predsádky + časti vnútra (BookPart) + zadná strana.
  Časť je jedna strana, okrem dvojstrany príbehu, ktorá zaberá dve.
*/

import type {
  ActivityId,
  Binding,
  BookFormat,
  CoverDesign,
  LayoutId,
  PageCount,
  ReadingLevel,
  StyleId,
} from "@/config/catalog";
import type { BookLanguage } from "@/i18n/locales";
import type { EndpaperId, FontPairId, TextZone, ThemeId, TitlePosition } from "../design";

/** Obrázok z úložiska. `src` doplní až vrstva, ktorá renderuje (podpísaná URL alebo PDF). */
export type BookImage = { key: string; src?: string };

export type BookOptions = {
  format: BookFormat;
  pageCount: PageCount;
  binding: Binding;
  style: StyleId;
  layout: LayoutId;
  readingLevel: ReadingLevel;
  cover: CoverDesign;
  theme: ThemeId;
  fontPair: FontPairId;
  titlePosition: TitlePosition;
  endpaper: EndpaperId;
  frames: boolean;
  /** Presne 4 aktivity v poradí, v akom idú v knihe. */
  activities: ActivityId[];
  parentGuide: boolean;
  parentLetter: boolean;
  backPortrait: boolean;
};

export type BookMeta = {
  language: BookLanguage;
  /** Názov knihy s dosadeným menom. */
  title: string;
  /** Meno hrdinu v nominatíve (diplom, obkresľovanie). */
  heroName: string;
  /** Číslo objednávky – v tiráži a mimo orezu na obálke; pred objednávkou chýba. */
  orderRef?: string;
  /** Adresa osobnej stránky knihy za QR kódom (balík D). */
  personalPageUrl: string;
  /** Deň vytvorenia verzie (ISO dátum) – diplom, tiráž. */
  date: string;
  /** Alternatívne texty v jazyku knihy (prístupnosť e-knihy); `illustration` obsahuje {n}. */
  alt: { illustration: string; hero: string; qr: string; missing: string };
};

export type CoverData = {
  title: string;
  annotation: string;
  /** Postava hrdinu z Karty (celá postava). */
  hero: BookImage | null;
  portrait: BookImage | null;
  /** Ilustrácia prvej dvojstrany – pre obálku „hrdina v scéne“. */
  scene: BookImage | null;
};

export type BackCoverData = {
  text: string;
  portrait: BookImage | null;
};

// ---------------------------------------------------------------- aktivity

export type TraceNameData = { name: string };
export type FindLettersData = { grid: string[][]; targets: string[] };
export type CountItem = { icon: CountIcon; n: number };
export type CountIcon = "star" | "apple" | "ball" | "flower" | "fish" | "heart";
export type CountData = { items: CountItem[] };
/** Bludisko: bunky po riadkoch, bitová maska otvorených stien (1 hore, 2 vpravo, 4 dole, 8 vľavo). */
export type MazeData = { cols: number; rows: number; cells: number[] };
export type QuestionsData = { questions: string[] };
export type DrawData = { sentence: string };
export type DiplomaData = { name: string; reason: string; date: string; signatureLabel: string };

export type ActivityPayload =
  | { activity: "trace_name"; data: TraceNameData }
  | { activity: "find_letters"; data: FindLettersData }
  | { activity: "count"; data: CountData }
  | { activity: "maze"; data: MazeData }
  | { activity: "questions"; data: QuestionsData }
  | { activity: "draw"; data: DrawData }
  | { activity: "diploma"; data: DiplomaData };

// ---------------------------------------------------------------- časti vnútra

export type StorySpreadPart = {
  kind: "story_spread";
  /** Poradie dvojstrany príbehu od 0. */
  spread: number;
  layout: LayoutId;
  /** Celý text dvojstrany (pri obrázkovom layoute rozdelený v `parts`). */
  text: string;
  /** Text pre ľavú a pravú stranu, ak ho layout delí. */
  textParts?: [string, string];
  textZone: TextZone;
  illustration: BookImage | null;
};

export type TitlePart = {
  kind: "title";
  title: string;
  dedication?: string;
  from?: string;
  date?: string;
};

export type ActivityPart = { kind: "activity"; heading: string; instruction: string } & ActivityPayload;

export type ParentGuidePart = {
  kind: "parent_guide";
  heading: string;
  goal?: string;
  questionsHeading: string;
  questions: string[];
  tipsHeading: string;
  tips: string[];
};

export type ParentLetterPart = { kind: "parent_letter"; heading: string; text: string };

/** Voľná strana na kreslenie – vypĺňa miesto, aby rozsah knihy sedel. */
export type FreeDrawPart = { kind: "free_draw"; heading: string };

export type ImprintPart = {
  kind: "imprint";
  title: string;
  /** Viditeľné označenie AI (S7, S16). */
  aiNotice: string;
  lines: string[];
  qrUrl: string;
  qrLabel: string;
};

export type BookPart =
  | StorySpreadPart
  | TitlePart
  | ActivityPart
  | ParentGuidePart
  | ParentLetterPart
  | FreeDrawPart
  | ImprintPart;

export type BookPartKind = BookPart["kind"];

export type Book = {
  meta: BookMeta;
  options: BookOptions;
  cover: CoverData;
  back: BackCoverData;
  parts: BookPart[];
  /** Stav strán pri generovaní (kľúč = index časti); chýbajúci = hotová. */
  status?: Record<number, "pending" | "needs_review">;
};

// ---------------------------------------------------------------- strany

/** Fyzická strana vnútra knihy (1 = prvá strana za predsádkou). */
export type InteriorPage = {
  number: number;
  partIndex: number;
  /** Pri dvojstrane príbehu: ktorá polovica. */
  side?: "left" | "right";
};

/** Čo sa zobrazí na jednej strane náhľadu alebo PDF. */
export type PageRef =
  | { type: "cover" }
  | { type: "back_cover" }
  | { type: "endpaper"; position: "front" | "back" }
  | { type: "interior"; page: InteriorPage }
  | { type: "blank" };
