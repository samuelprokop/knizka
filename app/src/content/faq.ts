/*
  Časté otázky (marketing/podpora) – nie sú v slovníku mikrotextov aplikácie.
  Odpovede vychádzajú z produktovej špecifikácie (náhľad zadarmo, platba po schválení,
  mazanie fotiek, doručenie, reklamácie). České texty sú prvý návrh na korektúru.

  Premenné v odpovediach dopĺňa faqFor() z konfigurácie trhu (ceny, dni doručenia) –
  cena sa nikdy nepíše natvrdo. Otázky s `top` (5) sa ukážu aj na úvodnej stránke –
  najčastejšie obavy pred nákupom: podoba, fotka, cena, kedy sa platí, doručenie.
*/

import { formatMoney, type Market } from "@/config/markets";
import type { BookLanguage } from "@/i18n/locales";

export type FaqItem = { id: string; q: string; a: string; top?: boolean };
export type FaqCategory = { id: string; title: string; items: FaqItem[] };

type Vars = { ebook: string; print: string; character: string; custom: string; shipping: string; freeFrom: string; giftWrap: string; days: number; payments: string };

const SK = (v: Vars): FaqCategory[] => [
  {
    id: "ako-vznika",
    title: "Ako kniha vzniká",
    items: [
      {
        id: "ako-vznikne",
        q: "Ako vznikne kniha s mojím dieťaťom?",
        a: "Zadáte meno a vek, nahráte fotku alebo dieťa opíšete a vyberiete štýl ilustrácií. Z fotky nakreslíme hrdinu, vyberiete príbeh a knihu poskladáme. Celý náhľad si prelistujete zadarmo a až potom sa rozhodnete.",
      },
      {
        id: "ako-dlho",
        q: "Ako dlho trvá vytvorenie knihy?",
        a: "Vyplnenie zaberie asi 10 minút, kniha sa potom poskladá do niekoľkých minút. Rozpracovanú knihu si môžete uložiť – pošleme vám odkaz a pokračujete, kedy chcete, aj na inom zariadení.",
      },
      {
        id: "pribehy",
        q: "Môžem si vybrať príbeh alebo napísať vlastný?",
        a: `Hotové príbehy píšu naši redaktori pre deti od 3 do 8 rokov. Ak nenájdete ten pravý, vytvoríme príbeh na mieru podľa niekoľkých otázok alebo podľa vášho textu (+ ${v.custom}).`,
      },
      {
        id: "postavy",
        q: "Môžu byť v knihe aj súrodenci, starí rodičia alebo domáci miláčik?",
        a: `Áno, do knihy pridáte až 3 ďalšie postavy – z fotky alebo podľa opisu (+ ${v.character} za postavu). Dieťa môže sprevádzať aj náš maskot alebo zvieratko podľa vášho výberu.`,
      },
      {
        id: "meno",
        q: "Bude meno v knihe správne vyskloňované?",
        a: "Áno. Meno skloňujeme podľa slovníka mien; pri nezvyčajnom mene si tvary skontrolujete a upravíte a pred tlačou ich prečíta náš redaktor.",
      },
    ],
  },
  {
    id: "fotka",
    title: "Podoba a fotka",
    items: [
      {
        id: "podoba",
        top: true,
        q: "Bude sa dieťa v knihe naozaj podobať?",
        a: "Z fotky nakreslíme Kartu hrdinu vo vybranom štýle a vy ju pred tvorbou knihy schválite. Ak niečo nesedí, napíšete čo – máte 3 pokusy zdarma, a keď sa podoba stále nedarí, pripraví ju náš grafik.",
      },
      {
        id: "fotka-sukromie",
        top: true,
        q: "Čo sa stane s fotkou môjho dieťaťa?",
        a: "Fotku použijeme len na nakreslenie podoby. Po schválení podoby ju zmažeme do 24 hodín (najneskôr do 7 dní). Nikdy nie je verejná, nejde do reklám ani analytiky.",
      },
      {
        id: "bez-fotky",
        q: "Musím nahrať fotku?",
        a: "Nie. Dieťa môžete opísať – farba a dĺžka vlasov, oči, pleť, okuliare či pehy – a hrdinu nakreslíme podľa opisu.",
      },
    ],
  },
  {
    id: "cena",
    title: "Cena a platba",
    items: [
      {
        id: "kolko-stoji",
        top: true,
        q: "Koľko kniha stojí?",
        a: `E-kniha stojí ${v.ebook}, tlačená kniha v pevnej väzbe aj s e-knihou ${v.print}. Doprava od ${v.shipping}, pri nákupe nad ${v.freeFrom} zadarmo. Cenu vidíte počas celej tvorby, v košíku vás nič neprekvapí.`,
      },
      {
        id: "kedy-platim",
        top: true,
        q: "Kedy platím?",
        a: "Až keď sa vám kniha páči. Celý náhľad je zadarmo (s vodoznakom), platíte až po jeho schválení v košíku.",
      },
      { id: "platba", q: "Ako môžem zaplatiť?", a: `${v.payments}. Údaje karty spracuje priamo platobná brána, na náš server sa nedostanú.` },
      {
        id: "kod",
        q: "Mám zľavový kód alebo darčekovú poukážku. Kde ich zadám?",
        a: "V košíku kliknite na „Máte zľavový kód alebo poukážku?“. Na jednu objednávku sa dá použiť jeden kód.",
      },
    ],
  },
  {
    id: "dorucenie",
    title: "Doručenie a darček",
    items: [
      {
        id: "kedy-dostanem",
        top: true,
        q: "Kedy knihu dostanem?",
        a: `E-knihu hneď po zaplatení. Tlačenú knihu vytlačíme a odošleme do ${v.days} pracovných dní – na výdajné miesto alebo kuriérom domov.`,
      },
      {
        id: "darcek-nacas",
        q: "Stihne kniha prísť ako darček načas?",
        a: `Počítajte s ${v.days} pracovnými dňami na tlač a s dňom až dvoma na doručenie. Ak sa ponáhľate, e-knihu môžete darovať hneď a tlačená príde dodatočne.`,
      },
      {
        id: "balenie",
        q: "Dá sa knihu darčekovo zabaliť a pridať venovanie?",
        a: `Áno. Venovanie aj list od rodiča napíšete v poslednom kroku, darčekové balenie pridáte v košíku (+ ${v.giftWrap}).`,
      },
    ],
  },
  {
    id: "objednavka",
    title: "Objednávka a reklamácia",
    items: [
      {
        id: "stav",
        q: "Kde vidím stav objednávky?",
        a: "Odkaz na stav objednávky je v potvrdzovacom e-maile. Nájdete tam aj e-knihu na stiahnutie.",
      },
      {
        id: "chyba",
        q: "Čo ak je vo vytlačenej knihe chyba?",
        a: "Každú knihu pred tlačou skontroluje človek. Ak sa výtlačok líši od schváleného náhľadu alebo príde poškodený, nahláste to na stránke objednávky – vytlačíme ho znova zadarmo.",
      },
      {
        id: "vratenie",
        q: "Môžem knihu vrátiť?",
        a: "Kniha sa vyrába len pre vaše dieťa, preto sa na ňu podľa zákona nevzťahuje 14-dňové odstúpenie od zmluvy. Preto si celú knihu pred zaplatením prezriete, a ak je chyba na našej strane, vytlačíme ju znova.",
      },
      {
        id: "dalsi-vytlacok",
        q: "Môžem neskôr objednať ďalší výtlačok?",
        a: "Áno – na osobnej stránke knihy (odkaz je v e-maile aj v QR kóde v knihe) objednáte ďalší výtlačok bez nového vyplňovania.",
      },
    ],
  },
];

const CS = (v: Vars): FaqCategory[] => [
  {
    id: "ako-vznika",
    title: "Jak kniha vzniká",
    items: [
      {
        id: "ako-vznikne",
        q: "Jak vznikne kniha s mým dítětem?",
        a: "Zadáte jméno a věk, nahrajete fotku nebo dítě popíšete a vyberete styl ilustrací. Z fotky nakreslíme hrdinu, vyberete příběh a knihu poskládáme. Celý náhled si prolistujete zdarma a teprve potom se rozhodnete.",
      },
      {
        id: "ako-dlho",
        q: "Jak dlouho trvá vytvoření knihy?",
        a: "Vyplnění zabere asi 10 minut, kniha se pak poskládá během několika minut. Rozpracovanou knihu si můžete uložit – pošleme vám odkaz a pokračujete, kdy chcete, i na jiném zařízení.",
      },
      {
        id: "pribehy",
        q: "Můžu si vybrat příběh, nebo napsat vlastní?",
        a: `Hotové příběhy píší naši redaktoři pro děti od 3 do 8 let. Když nenajdete ten pravý, vytvoříme příběh na míru podle několika otázek nebo podle vašeho textu (+ ${v.custom}).`,
      },
      {
        id: "postavy",
        q: "Můžou být v knize i sourozenci, prarodiče nebo domácí mazlíček?",
        a: `Ano, do knihy přidáte až 3 další postavy – z fotky nebo podle popisu (+ ${v.character} za postavu). Dítě může provázet i náš maskot nebo zvířátko podle vašeho výběru.`,
      },
      {
        id: "meno",
        q: "Bude jméno v knize správně skloňované?",
        a: "Ano. Jméno skloňujeme podle slovníku jmen; u neobvyklého jména si tvary zkontrolujete a upravíte a před tiskem je přečte náš redaktor.",
      },
    ],
  },
  {
    id: "fotka",
    title: "Podoba a fotka",
    items: [
      {
        id: "podoba",
        top: true,
        q: "Bude se dítě v knize opravdu podobat?",
        a: "Z fotky nakreslíme Kartu hrdiny ve vybraném stylu a vy ji před tvorbou knihy schválíte. Když něco nesedí, napíšete co – máte 3 pokusy zdarma, a pokud se podoba stále nedaří, připraví ji náš grafik.",
      },
      {
        id: "fotka-sukromie",
        top: true,
        q: "Co se stane s fotkou mého dítěte?",
        a: "Fotku použijeme jen k nakreslení podoby. Po schválení podoby ji smažeme do 24 hodin (nejpozději do 7 dnů). Nikdy není veřejná, nejde do reklam ani analytiky.",
      },
      {
        id: "bez-fotky",
        q: "Musím nahrát fotku?",
        a: "Ne. Dítě můžete popsat – barva a délka vlasů, oči, pleť, brýle nebo pihy – a hrdinu nakreslíme podle popisu.",
      },
    ],
  },
  {
    id: "cena",
    title: "Cena a platba",
    items: [
      {
        id: "kolko-stoji",
        top: true,
        q: "Kolik kniha stojí?",
        a: `E-kniha stojí ${v.ebook}, tištěná kniha v pevné vazbě i s e-knihou ${v.print}. Doprava od ${v.shipping}, při nákupu nad ${v.freeFrom} zdarma. Cenu vidíte během celé tvorby, v košíku vás nic nepřekvapí.`,
      },
      {
        id: "kedy-platim",
        top: true,
        q: "Kdy platím?",
        a: "Až když se vám kniha líbí. Celý náhled je zdarma (s vodoznakem), platíte až po jeho schválení v košíku.",
      },
      { id: "platba", q: "Jak můžu zaplatit?", a: `${v.payments}. Údaje karty zpracuje přímo platební brána, na náš server se nedostanou.` },
      {
        id: "kod",
        q: "Mám slevový kód nebo dárkový poukaz. Kde je zadám?",
        a: "V košíku klikněte na „Máte slevový kód nebo poukaz?“. Na jednu objednávku lze použít jeden kód.",
      },
    ],
  },
  {
    id: "dorucenie",
    title: "Doručení a dárek",
    items: [
      {
        id: "kedy-dostanem",
        top: true,
        q: "Kdy knihu dostanu?",
        a: `E-knihu hned po zaplacení. Tištěnou knihu vytiskneme a odešleme do ${v.days} pracovních dnů – na výdejní místo nebo kurýrem domů.`,
      },
      {
        id: "darcek-nacas",
        q: "Stihne kniha přijít jako dárek včas?",
        a: `Počítejte s ${v.days} pracovními dny na tisk a s jedním až dvěma dny na doručení. Když spěcháte, e-knihu můžete darovat hned a tištěná přijde dodatečně.`,
      },
      {
        id: "balenie",
        q: "Dá se kniha dárkově zabalit a přidat věnování?",
        a: `Ano. Věnování i dopis od rodiče napíšete v posledním kroku, dárkové balení přidáte v košíku (+ ${v.giftWrap}).`,
      },
    ],
  },
  {
    id: "objednavka",
    title: "Objednávka a reklamace",
    items: [
      { id: "stav", q: "Kde vidím stav objednávky?", a: "Odkaz na stav objednávky je v potvrzovacím e-mailu. Najdete tam i e-knihu ke stažení." },
      {
        id: "chyba",
        q: "Co když je v tištěné knize chyba?",
        a: "Každou knihu před tiskem zkontroluje člověk. Pokud se výtisk liší od schváleného náhledu nebo dorazí poškozený, nahlaste to na stránce objednávky – vytiskneme ho znovu zdarma.",
      },
      {
        id: "vratenie",
        q: "Můžu knihu vrátit?",
        a: "Kniha se vyrábí jen pro vaše dítě, proto se na ni podle zákona nevztahuje 14denní odstoupení od smlouvy. Proto si celou knihu před zaplacením prohlédnete, a pokud je chyba na naší straně, vytiskneme ji znovu.",
      },
      {
        id: "dalsi-vytlacok",
        q: "Můžu později objednat další výtisk?",
        a: "Ano – na osobní stránce knihy (odkaz je v e-mailu i v QR kódu v knize) objednáte další výtisk bez nového vyplňování.",
      },
    ],
  },
];

const PAYMENT_NAMES: Record<BookLanguage, Record<string, string>> = {
  sk: { card: "kartou", apple_pay: "Apple Pay", google_pay: "Google Pay", bank_button: "internet bankingom", cod: "na dobierku" },
  cs: { card: "kartou", apple_pay: "Apple Pay", google_pay: "Google Pay", bank_button: "internetovým bankovnictvím", cod: "na dobírku" },
};

/** Otázky pre trh – ceny a dni doručenia z konfigurácie (cena nikdy natvrdo). */
export function faqFor(market: Market): FaqCategory[] {
  const lang = market.uiLanguage;
  const methods = market.paymentMethods.filter((m) => m !== "cod" || market.codAllowedForPersonalizedBook).map((m) => PAYMENT_NAMES[lang][m] ?? m);
  const list = methods.length > 1 ? `${methods.slice(0, -1).join(", ")} ${lang === "sk" ? "alebo" : "nebo"} ${methods.at(-1)}` : methods[0] ?? "";
  const cheapest = Math.min(...market.carriers.map((c) => c.priceMinor));
  const vars: Vars = {
    ebook: formatMoney(market.prices.ebookOnly, market),
    print: formatMoney(market.prices.basePrintAndEbook, market),
    character: formatMoney(market.prices.extraCharacter, market),
    custom: formatMoney(market.prices.customStory, market),
    shipping: formatMoney(cheapest, market),
    freeFrom: formatMoney(market.freeShippingFromMinor, market),
    giftWrap: formatMoney(market.prices.giftWrap, market),
    days: market.deliveryWorkingDays,
    payments: `${lang === "sk" ? "Zaplatiť môžete" : "Zaplatit můžete"} ${list}`,
  };
  return lang === "sk" ? SK(vars) : CS(vars);
}

/** Najčastejšie obavy pred nákupom – kratší zoznam na úvodnú stránku. */
export const topFaq = (categories: FaqCategory[]) => categories.flatMap((c) => c.items.filter((i) => i.top));
