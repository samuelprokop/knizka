/*
  Obchodné podmienky – PRACOVNÝ NÁVRH na posúdenie právnikom (nie je to právne
  overené znenie). Zohľadňuje špecifiká produktu zo špecifikácie: náhľad zadarmo,
  personalizovaný tovar (bez 14-dňového odstúpenia), mazanie fotiek, reklamácia
  novou tlačou. Údaje o predávajúcom (IČO, sídlo) doplní zadávateľ.
  Premenné dopĺňa termsFor() z konfigurácie trhu.
*/

import type { Market } from "@/config/markets";
import type { BookLanguage } from "@/i18n/locales";

export type TermsSection = { id: string; title: string; paragraphs: string[] };
export type Terms = { title: string; draftNote: string; updated: string; sections: TermsSection[] };

type Vars = { email: string; days: number; currency: string };

const SK = (v: Vars): Terms => ({
  title: "Obchodné podmienky",
  draftNote: "Pracovný návrh – znenie pred spustením obchodu schvaľuje právnik.",
  updated: "Platné od spustenia obchodu",
  sections: [
    {
      id: "zakladne",
      title: "1. Základné ustanovenia",
      paragraphs: [
        "Tieto obchodné podmienky upravujú nákup personalizovaných detských kníh v elektronickej a tlačenej podobe cez túto webovú stránku.",
        `Predávajúcim je TAKTIK vydavateľstvo, s.r.o. (údaje o sídle a IČO doplníme). Kontakt: ${v.email}.`,
        "Kupujúcim je osoba, ktorá knihu objedná. Ak kupujúci nakupuje ako spotrebiteľ, má práva podľa predpisov na ochranu spotrebiteľa.",
      ],
    },
    {
      id: "objednavka",
      title: "2. Tvorba knihy a objednávka",
      paragraphs: [
        "Knihu si kupujúci vytvorí v konfigurátore: zadá údaje o dieťati, nahrá fotku alebo dieťa opíše, vyberie príbeh a vzhľad knihy. Náhľad celej knihy je bezplatný a nezáväzný.",
        "Kupujúci pred objednávkou knihu schváli – potvrdí správnosť mien, textov a podoby postáv. Za údaje a texty, ktoré schválil, zodpovedá kupujúci.",
        "Zmluva vzniká zaplatením objednávky, prípadne jej odoslaním pri platbe na dobierku. Potvrdenie objednávky pošleme e-mailom.",
      ],
    },
    {
      id: "cena",
      title: "3. Cena a platba",
      paragraphs: [
        `Ceny sú uvedené v mene ${v.currency} vrátane DPH. Konečná cena vrátane príplatkov a dopravy je zobrazená v košíku pred zaplatením.`,
        "Zaplatiť je možné spôsobmi uvedenými v pokladni. Údaje platobnej karty spracúva platobná brána, predávajúci ich nevidí ani neukladá.",
        "Zľavové kódy a darčekové poukážky sa uplatňujú v košíku; na jednu objednávku je možné použiť jeden kód.",
      ],
    },
    {
      id: "dodanie",
      title: "4. Dodanie",
      paragraphs: [
        "E-kniha je dostupná na stiahnutie ihneď po zaplatení (odkaz je v potvrdzovacom e-maile a na stránke objednávky).",
        `Tlačenú knihu predávajúci vytlačí a odovzdá dopravcovi spravidla do ${v.days} pracovných dní od zaplatenia. Dodaciu lehotu dopravcu a cenu dopravy vidí kupujúci pri výbere spôsobu doručenia.`,
      ],
    },
    {
      id: "odstupenie",
      title: "5. Odstúpenie od zmluvy",
      paragraphs: [
        "Kniha je tovar vyrobený podľa osobitných požiadaviek kupujúceho (meno, podoba a texty dieťaťa). Spotrebiteľ preto nemôže od zmluvy odstúpiť v 14-dňovej lehote bez udania dôvodu (§ 7 ods. 6 písm. c) zákona č. 102/2014 Z. z.).",
        "Z tohto dôvodu je náhľad celej knihy pred zaplatením bezplatný. Práva z vád (reklamácia) tým nie sú dotknuté.",
      ],
    },
    {
      id: "reklamacia",
      title: "6. Reklamácie",
      paragraphs: [
        "Ak sa tlačená kniha líši od schváleného náhľadu, má chybu tlače alebo príde poškodená, kupujúci to nahlási na stránke svojej objednávky (tlačidlo „Niečo nie je v poriadku“) alebo e-mailom.",
        "Oprávnenú reklamáciu vybavíme novou tlačou zadarmo, prípadne vrátením ceny. Reklamáciu vybavíme bez zbytočného odkladu, najneskôr do 30 dní.",
      ],
    },
    {
      id: "osobne-udaje",
      title: "7. Osobné údaje a fotografie",
      paragraphs: [
        "Fotografie dieťaťa používame výhradne na nakreslenie jeho podoby v knihe. Po schválení podoby ich vymažeme do 24 hodín, najneskôr do 7 dní. Nie sú verejné a nepoužívajú sa na reklamu ani analytiku.",
        "Kupujúci nahraním fotky potvrdzuje, že je zákonným zástupcom dieťaťa alebo má jeho súhlas; pri fotke inej osoby potvrdzuje jej súhlas.",
        "Podrobnosti o spracúvaní osobných údajov upravujú zásady ochrany súkromia.",
      ],
    },
    {
      id: "obsah",
      title: "8. Obsah knihy",
      paragraphs: [
        "Príbehy a ilustrácie vytvára predávajúci, s pomocou nástrojov umelej inteligencie; každú knihu pred tlačou skontroluje človek.",
        "Kupujúci získava knihu na osobné a nekomerčné použitie (napr. ako darček). Ďalšie šírenie alebo predaj obsahu nie je dovolený.",
      ],
    },
    {
      id: "zaverecne",
      title: "9. Záverečné ustanovenia",
      paragraphs: [
        "Spotrebiteľ sa so sťažnosťou môže obrátiť na predávajúceho, na Slovenskú obchodnú inšpekciu alebo využiť alternatívne riešenie sporov.",
        "Predávajúci môže podmienky zmeniť; na objednávku sa vzťahuje znenie platné v čase jej odoslania.",
      ],
    },
  ],
});

const CS = (v: Vars): Terms => ({
  title: "Obchodní podmínky",
  draftNote: "Pracovní návrh – znění před spuštěním obchodu schvaluje právník.",
  updated: "Platné od spuštění obchodu",
  sections: [
    {
      id: "zakladne",
      title: "1. Základní ustanovení",
      paragraphs: [
        "Tyto obchodní podmínky upravují nákup personalizovaných dětských knih v elektronické a tištěné podobě přes tuto webovou stránku.",
        `Prodávajícím je TAKTIK vydavateľstvo, s.r.o. (údaje o sídle a IČO doplníme). Kontakt: ${v.email}.`,
        "Kupujícím je osoba, která knihu objedná. Pokud kupující nakupuje jako spotřebitel, má práva podle předpisů na ochranu spotřebitele.",
      ],
    },
    {
      id: "objednavka",
      title: "2. Tvorba knihy a objednávka",
      paragraphs: [
        "Knihu si kupující vytvoří v konfigurátoru: zadá údaje o dítěti, nahraje fotku nebo dítě popíše, vybere příběh a vzhled knihy. Náhled celé knihy je bezplatný a nezávazný.",
        "Kupující před objednávkou knihu schválí – potvrdí správnost jmen, textů a podoby postav. Za údaje a texty, které schválil, odpovídá kupující.",
        "Smlouva vzniká zaplacením objednávky, případně jejím odesláním při platbě na dobírku. Potvrzení objednávky pošleme e-mailem.",
      ],
    },
    {
      id: "cena",
      title: "3. Cena a platba",
      paragraphs: [
        `Ceny jsou uvedeny v měně ${v.currency} včetně DPH. Konečná cena včetně příplatků a dopravy je zobrazena v košíku před zaplacením.`,
        "Zaplatit lze způsoby uvedenými v pokladně. Údaje platební karty zpracovává platební brána, prodávající je nevidí ani neukládá.",
        "Slevové kódy a dárkové poukazy se uplatňují v košíku; na jednu objednávku lze použít jeden kód.",
      ],
    },
    {
      id: "dodanie",
      title: "4. Dodání",
      paragraphs: [
        "E-kniha je ke stažení ihned po zaplacení (odkaz je v potvrzovacím e-mailu a na stránce objednávky).",
        `Tištěnou knihu prodávající vytiskne a předá dopravci zpravidla do ${v.days} pracovních dnů od zaplacení. Dodací lhůtu dopravce a cenu dopravy vidí kupující při výběru způsobu doručení.`,
      ],
    },
    {
      id: "odstupenie",
      title: "5. Odstoupení od smlouvy",
      paragraphs: [
        "Kniha je zboží vyrobené podle zvláštních požadavků kupujícího (jméno, podoba a texty dítěte). Spotřebitel proto nemůže od smlouvy odstoupit ve 14denní lhůtě bez udání důvodu (§ 1837 písm. d) občanského zákoníku).",
        "Z tohoto důvodu je náhled celé knihy před zaplacením bezplatný. Práva z vad (reklamace) tím nejsou dotčena.",
      ],
    },
    {
      id: "reklamacia",
      title: "6. Reklamace",
      paragraphs: [
        "Pokud se tištěná kniha liší od schváleného náhledu, má chybu tisku nebo dorazí poškozená, kupující to nahlásí na stránce své objednávky (tlačítko „Něco není v pořádku“) nebo e-mailem.",
        "Oprávněnou reklamaci vyřídíme novým tiskem zdarma, případně vrácením ceny. Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do 30 dnů.",
      ],
    },
    {
      id: "osobne-udaje",
      title: "7. Osobní údaje a fotografie",
      paragraphs: [
        "Fotografie dítěte používáme výhradně k nakreslení jeho podoby v knize. Po schválení podoby je smažeme do 24 hodin, nejpozději do 7 dnů. Nejsou veřejné a nepoužívají se k reklamě ani analytice.",
        "Kupující nahráním fotky potvrzuje, že je zákonným zástupcem dítěte nebo má jeho souhlas; u fotky jiné osoby potvrzuje její souhlas.",
        "Podrobnosti o zpracování osobních údajů upravují zásady ochrany soukromí.",
      ],
    },
    {
      id: "obsah",
      title: "8. Obsah knihy",
      paragraphs: [
        "Příběhy a ilustrace vytváří prodávající s pomocí nástrojů umělé inteligence; každou knihu před tiskem zkontroluje člověk.",
        "Kupující získává knihu k osobnímu a nekomerčnímu použití (např. jako dárek). Další šíření nebo prodej obsahu není dovolen.",
      ],
    },
    {
      id: "zaverecne",
      title: "9. Závěrečná ustanovení",
      paragraphs: [
        "Spotřebitel se se stížností může obrátit na prodávajícího, na Českou obchodní inspekci nebo využít mimosoudní řešení sporů.",
        "Prodávající může podmínky změnit; na objednávku se vztahuje znění platné v době jejího odeslání.",
      ],
    },
  ],
});

export function termsFor(market: Market): Terms {
  const vars: Vars = { email: market.supportEmail, days: market.deliveryWorkingDays, currency: market.currency === "EUR" ? "euro" : "Kč" };
  return (market.uiLanguage as BookLanguage) === "sk" ? SK(vars) : CS(vars);
}
