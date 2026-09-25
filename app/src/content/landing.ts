/*
  Texty úvodnej stránky (marketing) – nie sú v slovníku mikrotextov aplikácie.
  České texty sú prvý návrh a potrebujú korektúru rodeným redaktorom.
*/

import type { BookLanguage } from "@/i18n/locales";

export type LandingCopy = {
  eyebrow: string;
  title: string;
  scrollHint: string;
  /** toc = kľúčové slovo kroku v obsahu stránky (bočné menu). */
  steps: { number: string; title: string; text: string; toc: string }[];
  outroTitle: string;
  outroText: string;
  cta: string;
  /** Pod hlavným tlačidlom – zníženie rizika (náhľad zadarmo, platba až potom). */
  ctaNote: string;
  /** Cenová kotva pri výzve: {ebook}, {print}. */
  priceLine: string;
  animationLabel: string;
  staticImageAlt: string;
  /** Názov na obálke knihy v hero. */
  coverTitle: string;
  /** Obsah stránky (bočné menu): názov navigácie a kľúčové slová položiek mimo 4 krokov. */
  toc: { label: string; intro: string; outro: string; reviews: string; faq: string; footer: string };
  /** Sekcia recenzií pod knihou (samotné recenzie sú v content/reviews.ts). */
  reviews: { eyebrow: string; title: string; subtitle: string; placeholderNote: string; pause: string; play: string };
};

export const LANDING_COPY: Record<BookLanguage, LandingCopy> = {
  sk: {
    eyebrow: "Personalizovaná detská kniha",
    title: "Kniha, kde je hrdinom vaše dieťa",
    scrollHint: "Posuňte nižšie",
    steps: [
      { number: "01", title: "Poviete nám o dieťati", text: "Meno, vek a jazyk knihy. Meno v príbehu správne vyskloňujeme.", toc: "Dieťa" },
      { number: "02", title: "Nahráte fotku", text: "Vytvoríme ilustrovanú podobu vášho dieťaťa. Fotku potom zmažeme.", toc: "Fotka" },
      { number: "03", title: "Vyberiete príbeh", text: "Hotový od našich redaktorov, alebo napísaný na mieru.", toc: "Príbeh" },
      { number: "04", title: "Pozriete si celú knihu", text: "Náhľad je zadarmo, platíte až keď sa vám páči. Tlač do 5 pracovných dní.", toc: "Náhľad" },
    ],
    outroTitle: "Vytvorte knihu ešte dnes",
    outroText: "Náhľad zadarmo, tlač do 5 pracovných dní.",
    cta: "Vytvoriť knihu",
    ctaNote: "Náhľad celej knihy zadarmo. Platíte, až keď sa vám páči.",
    priceLine: "E-kniha {ebook} · tlačená kniha {print} vrátane e-knihy",
    animationLabel: "Animácia knihy, ktorá sa pri posúvaní stránky otvára a listuje",
    staticImageAlt: "Otvorená kniha s krokmi, ako vzniká personalizovaná kniha",
    coverTitle: "Moja kniha",
    toc: { label: "Obsah stránky", intro: "Úvod", outro: "Objednávka", reviews: "Recenzie", faq: "Otázky", footer: "Kontakt" },
    reviews: {
      eyebrow: "Recenzie",
      title: "Čo hovoria rodičia",
      subtitle: "Skúsenosti rodín, ktoré už svoju knihu majú doma.",
      placeholderNote: "Ukážkové recenzie – pred spustením ich nahradia skutočné hodnotenia zákazníkov.",
      pause: "Zastaviť posúvanie recenzií",
      play: "Spustiť posúvanie recenzií",
    },
  },
  cs: {
    eyebrow: "Personalizovaná dětská kniha",
    title: "Kniha, ve které je hrdinou vaše dítě",
    scrollHint: "Posuňte níže",
    steps: [
      { number: "01", title: "Řeknete nám o dítěti", text: "Jméno, věk a jazyk knihy. Jméno v příběhu správně vyskloňujeme.", toc: "Dítě" },
      { number: "02", title: "Nahrajete fotku", text: "Vytvoříme ilustrovanou podobu vašeho dítěte. Fotku pak smažeme.", toc: "Fotka" },
      { number: "03", title: "Vyberete příběh", text: "Hotový od našich redaktorů, nebo napsaný na míru.", toc: "Příběh" },
      { number: "04", title: "Prohlédnete si celou knihu", text: "Náhled je zdarma, platíte, až když se vám líbí. Tisk do 5 pracovních dnů.", toc: "Náhled" },
    ],
    outroTitle: "Vytvořte knihu ještě dnes",
    outroText: "Náhled zdarma, tisk do 5 pracovních dnů.",
    cta: "Vytvořit knihu",
    ctaNote: "Náhled celé knihy zdarma. Platíte, až když se vám líbí.",
    priceLine: "E-kniha {ebook} · tištěná kniha {print} včetně e-knihy",
    animationLabel: "Animace knihy, která se při posouvání stránky otevírá a listuje",
    staticImageAlt: "Otevřená kniha s kroky, jak vzniká personalizovaná kniha",
    coverTitle: "Moje kniha",
    toc: { label: "Obsah stránky", intro: "Úvod", outro: "Objednávka", reviews: "Recenze", faq: "Otázky", footer: "Kontakt" },
    reviews: {
      eyebrow: "Recenze",
      title: "Co říkají rodiče",
      subtitle: "Zkušenosti rodin, které už svou knihu mají doma.",
      placeholderNote: "Ukázkové recenze – před spuštěním je nahradí skutečná hodnocení zákazníků.",
      pause: "Zastavit posouvání recenzí",
      play: "Spustit posouvání recenzí",
    },
  },
};
