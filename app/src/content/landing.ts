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
  animationLabel: string;
  staticImageAlt: string;
  /** Obsah stránky (bočné menu): názov navigácie a kľúčové slová položiek mimo 4 krokov. */
  toc: { label: string; intro: string; outro: string; footer: string };
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
    animationLabel: "Animácia knihy, ktorá sa pri posúvaní stránky otvára a listuje",
    staticImageAlt: "Otvorená prázdna kniha",
    toc: { label: "Obsah stránky", intro: "Úvod", outro: "Objednávka", footer: "Kontakt" },
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
    animationLabel: "Animace knihy, která se při posouvání stránky otevírá a listuje",
    staticImageAlt: "Otevřená prázdná kniha",
    toc: { label: "Obsah stránky", intro: "Úvod", outro: "Objednávka", footer: "Kontakt" },
  },
};
