/*
  Vzorový príbeh pre testy sadzby a demo náhľad – text z db:seed („prvý deň
  v škôlke“) rozšírený o 4 dvojstrany, aby sa dal vysadiť aj rozsah 40 strán.
  Nie je to obsah knižnice; tá je v DB (stories + story_editions).
*/

import type { StorySpread } from "@/db/schema";
import type { BookLanguage } from "@/i18n/locales";

const SCENES = [
  "Detská izba za úsvitu, hrdina sedí na posteli a naťahuje sa. Pokojná zóna vľavo hore.",
  "Hrdina a mama pri skrini, batôžtek na stoličke. Pokojná zóna vpravo.",
  "Ulica s lipami, hrdina drží mamu za ruku, na strome sedia vrabce. Pokojná zóna hore.",
  "Farebné dvere škôlky, hrdina stojí pred nimi s batôžkom. Pokojná zóna vľavo.",
  "Usmiata učiteľka sa skláňa k hrdinovi pri vchode. Pokojná zóna vpravo hore.",
  "Svetlá trieda s hračkami a kobercom v tvare vláčika. Pokojná zóna hore.",
  "Hrdina si sadá k dievčatku pri kockách. Pokojná zóna vľavo hore.",
  "Padajúca veža z kociek, dve smejúce sa deti. Pokojná zóna vpravo.",
  "Stôl s tanierom polievky, hrdina drží lyžicu. Pokojná zóna hore.",
  "Deti na ležadlách, učiteľka číta knihu. Pokojná zóna vľavo hore.",
  "Deti na školskom dvore pri pieskovisku. Pokojná zóna vpravo dole.",
  "Hrdina maľuje veľký obrázok slnka. Pokojná zóna vľavo dole.",
  "Deti v kruhu spievajú a tlieskajú. Pokojná zóna hore.",
  "Hrdina ukazuje mame svoj obrázok v šatni. Pokojná zóna vpravo hore.",
  "Hrdina beží v náručí mamy v šatni škôlky. Pokojná zóna vpravo hore.",
  "Hrdina v posteli pri nočnej lampičke, za oknom hviezdy. Pokojná zóna hore.",
];

const SK = [
  "Ráno sa {meno} zobudil{rod:|a} skôr ako slniečko. Dnes je veľký deň – prvý deň v škôlke!",
  "Mama pomohla {meno:D} obliecť si nové tričko a do batôžka zbalili obľúbenú hračku.",
  "Cestou {meno} pozeral{rod:|a} na vtáčiky. „Aj oni idú do svojej škôlky?“ opýtal{rod:|a} sa.",
  "Pred dverami škôlky sa {meno:D} trochu roztriasli kolená.",
  "Pani učiteľka sa usmiala: „Vitaj, {meno}! Čakali sme na teba.“",
  "V triede bolo plno hračiek, farbičiek a jeden veľký kobercový vláčik.",
  "Pri kocke sedelo dievčatko, ktoré sa tiež trochu bálo. {meno} si prisadol{rod:|a} bližšie.",
  "Spolu postavili vežu až do neba. Keď spadla, obaja sa rozosmiali.",
  "Na obed bola polievka s písmenkami. {meno} v nej hľadal{rod:|a} svoje meno.",
  "Po obede si všetci ľahli a pani učiteľka čítala rozprávku o odvážnom ježkovi.",
  "Na dvore sa piekli koláče z piesku. {meno} upiekol{rod:|a} ten najväčší.",
  "Potom {meno} namaľoval{rod:|a} slnko také veľké, že sa ledva zmestilo na papier.",
  "Pred odchodom si všetci zaspievali pesničku o vláčiku, ktorý ide okolo sveta.",
  "V šatni {meno} ukázal{rod:|a} mame obrázok. „Toto je naša škôlka,“ povedal{rod:|a} hrdo.",
  "Poobede prišla mama. {meno} sa rozbehol{rod:|a} k nej: „Mami, zajtra idem zas!“",
  "Večer v posteli sa {meno} usmieval{rod:|a}. Nový deň, nová kamarátka – a vôbec to nebolo strašidelné.",
];

const CS = [
  "Ráno se {meno} probudil{rod:|a} dřív než sluníčko. Dnes je velký den – první den ve školce!",
  "Maminka pomohla {meno:D} obléct nové tričko a do batůžku zabalili oblíbenou hračku.",
  "Cestou se {meno} díval{rod:|a} na ptáčky. „Jdou taky do své školky?“ zeptal{rod:|a} se.",
  "Před dveřmi školky se {meno:D} trochu roztřásla kolena.",
  "Paní učitelka se usmála: „Vítej, {meno:V}! Čekali jsme na tebe.“",
  "Ve třídě bylo plno hraček, pastelek a jeden velký kobercový vláček.",
  "U kostek sedělo děvčátko, které se taky trochu bálo. {meno} si přisedl{rod:|a} blíž.",
  "Spolu postavili věž až do nebe. Když spadla, oba se rozesmáli.",
  "K obědu byla polévka s písmenky. {meno} v ní hledal{rod:|a} svoje jméno.",
  "Po obědě si všichni lehli a paní učitelka četla pohádku o statečném ježkovi.",
  "Na dvoře se pekly bábovky z písku. {meno} upekl{rod:|a} tu největší.",
  "Potom {meno} namaloval{rod:|a} sluníčko tak velké, že se sotva vešlo na papír.",
  "Před odchodem si všichni zazpívali písničku o vláčku, který jede kolem světa.",
  "V šatně {meno} ukázal{rod:|a} mamince obrázek. „Tohle je naše školka,“ řekl{rod:|a} hrdě.",
  "Odpoledne přišla maminka. {meno} se k ní rozběhl{rod:|a}: „Mami, zítra jdu zas!“",
  "Večer v posteli se {meno} usmíval{rod:|a}. Nový den, nová kamarádka – a vůbec to nebylo strašidelné.",
];

const TEXTS: Record<BookLanguage, string[]> = { sk: SK, cs: CS };

export const SAMPLE_STORY: Record<
  BookLanguage,
  { title: string; annotation: string; developmentGoal: string; author: string }
> = {
  sk: {
    title: "{meno} ide do škôlky",
    annotation: "Prvý deň v škôlke je veľké dobrodružstvo. {meno} zistí, že nové miesto môže byť plné kamarátov.",
    developmentGoal: "Pripraviť dieťa na nástup do škôlky a zmierniť obavy z nového prostredia.",
    author: "Redakcia TAKTIK (vzorový text)",
  },
  cs: {
    title: "{meno} jde do školky",
    annotation: "První den ve školce je velké dobrodružství. {meno} zjistí, že nové místo může být plné kamarádů.",
    developmentGoal: "Připravit dítě na nástup do školky a zmírnit obavy z nového prostředí.",
    author: "Redakce TAKTIK (vzorový text)",
  },
};

/** 12 dvojstrán (32 strán) = pôvodný príbeh zo seedu, 16 (40 strán) = rozšírený. */
export function sampleSpreads(language: BookLanguage, count: 12 | 16): StorySpread[] {
  const indices = count === 16 ? SK.map((_, i) => i) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15];
  return indices.map((i) => ({ text: TEXTS[language][i], scene: SCENES[i] }));
}
