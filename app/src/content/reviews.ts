/*
  Recenzie na úvodnej stránke.

  POZOR: zatiaľ sú to UKÁŽKOVÉ texty (vymyslené), nie skutočné hodnotenia.
  Kým je REVIEWS_ARE_PLACEHOLDERS = true, sekcia má viditeľné označenie
  „ukážka“ a v produkcii sa vôbec nezobrazí – vymyslené recenzie sa nesmú
  vydávať za skutočné. Pred spustením: nahradiť skutočnými (so súhlasom
  zákazníkov, bez mien detí bez súhlasu rodiča) a prepnúť na false.
*/

import type { BookLanguage } from "@/i18n/locales";

export const REVIEWS_ARE_PLACEHOLDERS = true;

export type Review = { text: string; name: string; detail: string };

/** Zobraziť sekciu recenzií? Ukážkové len mimo produkcie. */
export const showReviews = () => !REVIEWS_ARE_PLACEHOLDERS || process.env.NODE_ENV !== "production";

export const REVIEWS: Record<BookLanguage, Review[]> = {
  sk: [
    { text: "Tobiáš si knihu nosí aj do postele. Keď zbadal svoje meno v nadpise, nechcel veriť, že je naozaj o ňom.", name: "Katarína", detail: "mama 5-ročného Tobiáša" },
    { text: "Najviac ma prekvapilo, že meno bolo v celom príbehu správne vyskloňované. Pri iných knihách to vždy škrípalo.", name: "Martin", detail: "otec 4-ročnej Emky" },
    { text: "Ilustrovaná Nelka sa jej naozaj podobá – kučery aj pieha na nose. Babka sa pri čítaní rozplakala.", name: "Zuzana", detail: "mama 6-ročnej Nelky" },
    { text: "Celý náhľad knihy sme si pozreli zadarmo a platili až potom. Ešte sme stihli upraviť venovanie.", name: "Peter", detail: "otec 3-ročného Samka" },
    { text: "Kvalitná tlač, pevná väzba a krásne farby. Kniha prišla pár dní pred narodeninami, presne načas.", name: "Lucia", detail: "krstná mama" },
    { text: "Príbeh na mieru o našom psovi Bleskovi bol trefa. Syn ho chce čítať každý večer znova.", name: "Andrea", detail: "mama 7-ročného Mateja" },
    { text: "Páčilo sa mi, že fotku po nakreslení postavičky zmazali. Pri deťoch na tom záleží.", name: "Michal", detail: "otec dvojčiat" },
    { text: "Darovali sme ju vnučke na Vianoce. Hľadala sa na každej strane a teraz si ju číta sama.", name: "Eva", detail: "stará mama Sofie" },
    { text: "Verzia na prvé čítanie s veľkým písmom bola presne to, čo sme potrebovali. Dcéra prečítala prvú knihu sama.", name: "Jana", detail: "mama 6-ročnej Lily" },
  ],
  cs: [
    { text: "Tobiáš si knihu nosí i do postele. Když uviděl své jméno v nadpisu, nechtěl věřit, že je opravdu o něm.", name: "Kateřina", detail: "máma 5letého Tobiáše" },
    { text: "Nejvíc mě překvapilo, že jméno bylo v celém příběhu správně skloňované. U jiných knih to vždycky skřípalo.", name: "Martin", detail: "táta 4leté Emy" },
    { text: "Ilustrovaná Nela se jí opravdu podobá – kudrny i piha na nose. Babička se u čtení rozplakala.", name: "Zuzana", detail: "máma 6leté Nely" },
    { text: "Celý náhled knihy jsme si prohlédli zdarma a platili až potom. Ještě jsme stihli upravit věnování.", name: "Petr", detail: "táta 3letého Sama" },
    { text: "Kvalitní tisk, pevná vazba a krásné barvy. Kniha přišla pár dní před narozeninami, přesně včas.", name: "Lucie", detail: "kmotra" },
    { text: "Příběh na míru o našem psovi Bleskovi byl trefa. Syn ho chce číst každý večer znovu.", name: "Andrea", detail: "máma 7letého Matěje" },
    { text: "Líbilo se mi, že fotku po nakreslení postavičky smazali. U dětí na tom záleží.", name: "Michal", detail: "táta dvojčat" },
    { text: "Darovali jsme ji vnučce k Vánocům. Hledala se na každé stránce a teď si ji čte sama.", name: "Eva", detail: "babička Sofie" },
    { text: "Verze pro první čtení s velkým písmem byla přesně to, co jsme potřebovali. Dcera přečetla první knihu sama.", name: "Jana", detail: "máma 6leté Lily" },
  ],
};
