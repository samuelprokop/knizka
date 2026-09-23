import "server-only";

/*
  Automatická kontrola strany (I7 – I9): anatómia, zhoda s Kartou postavy,
  počet postáv, text v obrázku. Bez reálneho modelu vieme dnes overiť len
  technické vlastnosti výstupu (rozmery); zvyšok je pripravené rozhranie pre
  neskoršiu reálnu kontrolu (balík B, keď firma dodá prístup). "regenerate"
  sa počíta do rovnakých pokusov ako výpadok adaptéra (max. 2 automatické
  opakovania) – po vyčerpaní strana čaká na grafika (needs_review).
*/

export type PageCheckVerdict =
  | { verdict: "ok" }
  | { verdict: "regenerate"; reason: string }
  | { verdict: "needs_review"; reason: string };

export type PageCheckInput = {
  image: { storageKey: string; width: number; height: number };
  /** Počet Kariet postáv, ktoré mali byť v scéne (kontrola počtu postáv, I8). */
  expectedCharacterCount: number;
  layout: string;
};

export interface PageChecker {
  readonly id: string;
  check(input: PageCheckInput): Promise<PageCheckVerdict>;
}

/** Mock: skutočne odchytí len zjavne poškodený výstup adaptéra (nulové rozmery). */
export const mockPageChecker: PageChecker = {
  id: "mock",
  async check({ image }) {
    if (image.width <= 0 || image.height <= 0) return { verdict: "regenerate", reason: "empty_image" };
    return { verdict: "ok" };
  },
};

export const getPageChecker = (): PageChecker => mockPageChecker;
