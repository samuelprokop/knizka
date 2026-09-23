/*
  Tvar údajov konfigurátora v jsonb stĺpcoch projects.options, storyInput,
  personalTexts a characters.appearance. Jeden zdroj pravdy pre server aj klienta.

  Voľby s textom v slovníku typu „a · b · c“ (napr. describe.hair_length)
  majú tu identifikátory v rovnakom poradí – test to stráži pre SK aj CZ.
*/

import type {
  ActivityId,
  BookFormat,
  CoverDesign,
  GuideKind,
  LayoutId,
  PageCount,
  ReadingLevel,
  StyleId,
} from "@/config/catalog";
import type { MessageKey } from "@/i18n/messages";
import type { StoryIdea } from "@/server/ai/types";

// ---------------------------------------------------------------- vzhľad postavy

export const HAIR_COLORS = ["blond", "light_brown", "dark_brown", "black", "red"] as const;
export const HAIR_LENGTHS = ["short", "medium", "long"] as const;
export const HAIRSTYLES = ["straight", "curly", "ponytail", "braids"] as const;
export const EYE_COLORS = ["blue", "green", "brown", "gray"] as const;
export const SKIN_TONES = ["very_light", "light", "medium", "tan", "dark"] as const;
export const OUTFIT_COLORS = ["red", "blue", "green", "yellow", "pink", "purple"] as const;
export const ACCESSORIES = ["none", "cap", "bow", "backpack"] as const;

/** Farby na prepínačoch (ikona namiesto textu, text je v aria-label). */
export const SWATCH: Record<string, string> = {
  blond: "#f2d27a",
  light_brown: "#b07a45",
  dark_brown: "#5b3a1e",
  black: "#1f1b17",
  red: "#c4452d",
  blue: "#4a8fd4",
  green: "#4f9b5a",
  brown: "#6b4424",
  gray: "#8c9197",
  very_light: "#f8e1cf",
  light: "#eac4a6",
  medium: "#cf9b72",
  tan: "#a86f47",
  dark: "#6e4429",
  yellow: "#f1c232",
  pink: "#ec8fb4",
  purple: "#8e6bbf",
};

export type Appearance = {
  hairColor?: (typeof HAIR_COLORS)[number];
  hairLength?: (typeof HAIR_LENGTHS)[number];
  hairstyle?: (typeof HAIRSTYLES)[number];
  eyes?: (typeof EYE_COLORS)[number];
  skin?: (typeof SKIN_TONES)[number];
  glasses?: boolean;
  freckles?: boolean;
  braces?: boolean;
  hearingAid?: boolean;
  wheelchair?: boolean;
  outfitColor?: (typeof OUTFIT_COLORS)[number];
  accessory?: (typeof ACCESSORIES)[number];
  /** Pri miláčikovi: druh, farba, veľkosť. */
  petKind?: string;
  petColor?: string;
};

export const APPEARANCE_CHOICES = {
  hairColor: { ids: HAIR_COLORS, labels: "describe.hair_color.options" },
  hairLength: { ids: HAIR_LENGTHS, labels: "describe.hair_length" },
  hairstyle: { ids: HAIRSTYLES, labels: "hero.edit.hairstyle.options" },
  eyes: { ids: EYE_COLORS, labels: "describe.eyes.options" },
  skin: { ids: SKIN_TONES, labels: "describe.skin.options" },
  outfitColor: { ids: OUTFIT_COLORS, labels: "hero.edit.outfit_color.options" },
  accessory: { ids: ACCESSORIES, labels: "hero.edit.accessory.options" },
} as const satisfies Record<string, { ids: readonly string[]; labels: MessageKey }>;

// ---------------------------------------------------------------- vzhľad knihy (krok 6)

/*
  Identifikátory tém, písiem a predsádok. Balík C (renderer) ich premení na
  skutočné palety a fonty – potom sa zoznamy presunú do config/catalog.ts.
*/
export const THEMES = ["sunny", "forest", "sea", "berry", "night", "pastel"] as const;
export const FONT_PAIRS = ["classic", "rounded", "handwritten", "large"] as const;
export const TITLE_POSITIONS = ["top", "bottom", "over"] as const;
export const ENDPAPERS = ["solid", "stars", "leaves", "dots", "waves", "name"] as const;

export const THEME_COLORS: Record<(typeof THEMES)[number], [string, string]> = {
  sunny: ["#ff661a", "#fff4ec"],
  forest: ["#2f7d4f", "#eef6ef"],
  sea: ["#00a5a0", "#e8f7f6"],
  berry: ["#b8336a", "#fbeef3"],
  night: ["#2d3a6b", "#eceef7"],
  pastel: ["#8e6bbf", "#f4effa"],
};

export type LookOptions = {
  cover: CoverDesign;
  theme: (typeof THEMES)[number];
  font: (typeof FONT_PAIRS)[number];
  titlePosition: (typeof TITLE_POSITIONS)[number];
  endpapers: (typeof ENDPAPERS)[number];
  frames: boolean;
  backPortrait: boolean;
  activities: ActivityId[];
  parentGuide: boolean;
  parentLetter: boolean;
  coloringBook: boolean;
};

export type ProjectOptions = {
  look?: Partial<LookOptions>;
  readingLevel?: ReadingLevel;
  /** Vlastný názov knihy (K5.11); bez neho názov príbehu. */
  bookTitle?: string;
  guide?: GuideKind;
  /** Zákazník odpovedal na otázku kroku 4 (Nie / Áno). */
  charactersDecided?: boolean;
  /** „Nechajte to na nás“ po vyčerpaní pokusov o podobu. */
  heroManualRequestedAt?: string;
  /** Odtlačok fotiek/opisu, z ktorých vznikli portréty štýlov. */
  portraitsFor?: string;
  /** Spotrebované úpravy v editore „Do detailu“ (K8.4). */
  editor?: { rewrites: number; imageEdits: number };
};

// ---------------------------------------------------------------- príbeh (krok 5)

export const DETAIL_SLOTS = ["toy", "food", "place", "hobby", "city", "kindergarten", "teacher", "friend"] as const;
export type DetailSlot = (typeof DETAIL_SLOTS)[number];
export const DETAIL_MAX_CHARS = 30;

export const WIZARD_WORLDS = ["forest", "sea", "space", "mountains", "city", "farm", "castle", "dinosaurs"] as const;
export const WIZARD_MESSAGES = ["courage", "friendship", "sleep", "sharing", "tidying", "new_place", "patience"] as const;
export const WIZARD_TONES = ["cheerful", "adventurous", "calm"] as const;
export const WIZARD_OCCASIONS = ["birthday", "nameday", "christmas", "kindergarten", "school", "none"] as const;
export const WIZARD_MAX_IDEA_ROUNDS = 3;

export type WizardAnswers = {
  occasion?: (typeof WIZARD_OCCASIONS)[number];
  worlds?: (typeof WIZARD_WORLDS)[number][];
  message?: (typeof WIZARD_MESSAGES)[number];
  favorites?: string;
  companions?: string[];
  tone?: (typeof WIZARD_TONES)[number];
  wish?: string;
};

export type GeneratedSpread = { text: string; scene: string; aiFilled?: boolean };

export type StoryInput = {
  /** Cesta B: vlastné detaily. */
  details?: Partial<Record<DetailSlot, string>>;
  /** Cesta C: odpovede, námety a počet kôl námetov. */
  wizard?: { answers: WizardAnswers; ideas?: StoryIdea[]; ideaRounds?: number };
  /** Cesta D: vlastný text. */
  own?: { text: string; mode: "strict" | "free" };
  /** Cesty C a D: text príbehu na schválenie. */
  generated?: { title: string; annotation: string; spreads: GeneratedSpread[] };
  rewritesUsed?: number;
  spreadCount?: 12 | 16;
  textApprovedAt?: string;
};

export type PersonalTexts = {
  dedication?: string;
  from?: string;
  date?: string;
  letter?: string;
  back?: string;
};

// ---------------------------------------------------------------- predvolené

/** PLACEHOLDER: meno maskota značky – rozhodne značka (Karta maskota je pevná v každom štýle). */
export const MASCOT_NAME = "Tiko";

export const STYLE_BY_AGE = (age: number): StyleId => (age <= 4 ? "watercolor" : age <= 6 ? "animated" : "modern");

export function defaultLook(activities: ActivityId[]): LookOptions {
  return {
    cover: "hero_big",
    theme: "sunny",
    font: "classic",
    titlePosition: "top",
    endpapers: "solid",
    frames: false,
    backPortrait: true,
    activities,
    parentGuide: true,
    parentLetter: false,
    coloringBook: false,
  };
}

export type BookSetup = { layout: LayoutId; format: BookFormat; pageCount: PageCount };
