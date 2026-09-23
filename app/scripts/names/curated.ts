/*
  Ručne zostavené doplnky slovníka (vlastné dielo projektu, bez cudzej licencie):
  - moderné mená novorodencov, ktoré v kalendároch menín nie sú (poradie podľa
    verejne publikovaných rebríčkov ŠÚ SR a ČSÚ – použité len ako zoznam mien),
  - domácke podoby najčastejších mien (Wikislovník ich má len čiastočne),
  - výnimky: presné tvary, ktoré pravidlá nevedia a zdroj ich nemá.
  Všetko ide do slovníka s verified = false – kontroluje korektor.
*/

import type { Gender } from "../../src/lib/language/types";

type Lang = "sk" | "cs";

const girls = (list: string) => list.split(/\s+/).filter(Boolean).map((name) => ({ name, gender: "girl" as Gender }));
const boys = (list: string) => list.split(/\s+/).filter(Boolean).map((name) => ({ name, gender: "boy" as Gender }));

export const MODERN_NAMES: Record<Lang, { name: string; gender: Gender }[]> = {
  sk: [
    ...boys(`Jakub Samuel Michal Adam Tomáš Filip Lukáš Matej Martin Oliver Peter Šimon Dávid Richard
      Matúš Daniel Sebastián Alex Leo Tobias Jozef Marek Kristián Andrej Patrik Timotej Teo Liam Noah
      Nicolas Maxim Hugo Leonard Viktor Benjamín Tadeáš Oskar Mathias Matias Alexander Adrián Erik
      Juraj Ján Dominik Denis Nathan Max Lukas Tobiáš Damián Rafael Teodor Oliver Olivier Elias Eliáš
      Mateo Matteo Leon Theo Kevin Marco Mário Christián Tristan Ian Aron Aaron Izák Jonáš Natan Radim`),
    ...girls(`Sofia Ema Nina Natália Viktória Eliška Laura Nela Mia Lucia Hana Sára Emma Olívia Alžbeta
      Karolína Klára Adela Amália Tamara Lea Ella Diana Kristína Zoja Tereza Zara Chloe Sofie Nikol
      Liliana Lily Rebeka Timea Emily Stela Mila Nelly Kiara Bianka Lara Vanesa Isabela Aurélia Elena
      Rozália Anabela Linda Paulína Veronika Simona Michaela Barbora Dominika Alica Ela Leila Lejla
      Nora Luna Aurora Ariana Melánia Natálie Ellie Naomi Viola Dorota Julia Júlia Nikola Kamila
      Vivien Mira Mía Lívia Lenka Terézia Sabína Daniela Andrea Petra Jana Martina Monika`),
  ],
  cs: [
    ...boys(`Jakub Jan Tomáš Adam Matyáš Vojtěch Filip Ondřej Lukáš David Matěj Šimon Dominik Daniel
      Martin Kryštof Antonín Tobiáš Josef Petr Michal Sebastian Theodor Oliver Viktor Mikuláš Eliáš
      Jonáš Tadeáš Hugo Maxmilián Max Leo Leon Liam Noah Samuel Alex Richard František Václav Marek
      Štěpán Vít Matouš Kristián Teodor Benjamin Matteo Nathan Adrian Patrik Erik Jiří Pavel Karel
      Radek Jáchym Vincent Oskar Tobias Robin Denis Albert Alexandr Artur Zdeněk Jaroslav Miroslav`),
    ...girls(`Eliška Anna Tereza Adéla Natálie Sofie Ema Karolína Kristýna Barbora Viktorie Kateřina Nela
      Julie Laura Veronika Klára Amálie Rozálie Emma Ella Mia Stela Zoe Elena Leontýna Johana Anežka
      Marie Magdaléna Lucie Sára Aneta Linda Valerie Nikola Nikol Denisa Michaela Vanesa Zuzana Emilie
      Lea Lily Emily Chloe Hana Agáta Dorota Beáta Rebeka Justýna Josefína Antonie Vanda Olivie
      Isabela Izabela Viola Alžběta Madlen Mila Nora Luna Ellie Naomi Kamila Vivien Stella Liliana`),
  ],
};

/** Domácke podoby: základné meno → podoby (poradie = ponuka v konfigurátore, J2). */
export const DIMINUTIVES: Record<Lang, Record<string, string[]>> = {
  sk: {
    Ján: ["Janko", "Janík", "Jano", "Janíčko"],
    Jakub: ["Kubko", "Kubo", "Kubík"],
    Peter: ["Peťko", "Peťo"],
    Tomáš: ["Tomáško", "Tomi"],
    Samuel: ["Samko", "Samo", "Samuelko"],
    Matej: ["Maťko", "Maťo"],
    Adam: ["Adamko"],
    Michal: ["Miško", "Mišo", "Michalko"],
    Martin: ["Martinko", "Marťo"],
    Lukáš: ["Lukáško"],
    Filip: ["Filipko"],
    Dávid: ["Dávidko"],
    Daniel: ["Danko", "Danielko", "Dano"],
    Šimon: ["Šimonko", "Šimko"],
    Richard: ["Riško", "Rišo"],
    Matúš: ["Matúško"],
    Juraj: ["Jurko", "Ďurko", "Ďuro"],
    Jozef: ["Jožko", "Jožo"],
    Andrej: ["Andrejko"],
    Pavol: ["Paľko", "Paľo", "Palko"],
    Štefan: ["Števko", "Števo"],
    Alexander: ["Saško", "Sašo"],
    Viktor: ["Viktorko"],
    Miroslav: ["Mirko", "Miro"],
    Radoslav: ["Radko", "Rado"],
    Vladimír: ["Vladko", "Vlado"],
    Ladislav: ["Lacko", "Laco"],
    František: ["Ferko", "Fero"],
    Jaroslav: ["Jarko", "Jaro"],
    Stanislav: ["Stanko", "Stano"],
    Ľubomír: ["Ľubko", "Ľubo"],
    Branislav: ["Branko", "Brano"],
    Rastislav: ["Rasťko", "Rasťo"],
    Patrik: ["Paťko", "Paťo"],
    Marek: ["Marečko"],
    Anna: ["Anička", "Anka", "Aňa", "Anča"],
    Mária: ["Majka", "Marienka", "Maruška"],
    Katarína: ["Katka", "Katarínka", "Katuška"],
    Ema: ["Emka", "Emička"],
    Sofia: ["Sofinka"],
    Nina: ["Ninka"],
    Eva: ["Evka", "Evička"],
    Zuzana: ["Zuzka", "Zuzanka", "Zuzička"],
    Lucia: ["Lucka", "Lucinka"],
    Hana: ["Hanka", "Hanička"],
    Natália: ["Natálka"],
    Viktória: ["Viktorka"],
    Laura: ["Laurinka"],
    Nela: ["Nelka", "Nelinka"],
    Sára: ["Sárka", "Sárinka"],
    Klára: ["Klárka", "Klárika"],
    Karolína: ["Karolínka"],
    Alžbeta: ["Betka", "Alžbetka"],
    Barbora: ["Barborka", "Baška"],
    Veronika: ["Veronka", "Verunka"],
    Kristína: ["Kristínka", "Tina"],
    Michaela: ["Miška", "Michaelka"],
    Simona: ["Simonka"],
    Petra: ["Peťka"],
    Jana: ["Janka", "Janička"],
    Martina: ["Martinka"],
    Monika: ["Monička"],
    Adela: ["Adelka"],
    Tereza: ["Terezka"],
    Diana: ["Dianka"],
    Helena: ["Helenka"],
    Magdaléna: ["Magda", "Magdalénka"],
    Paulína: ["Paulínka"],
    Rebeka: ["Rebečka"],
  },
  cs: {
    Jan: ["Honza", "Honzík", "Jeník", "Jenda"],
    Jakub: ["Kuba", "Kubík", "Kubíček"],
    Tomáš: ["Tomášek", "Tomík"],
    Petr: ["Péťa", "Petřík"],
    Adam: ["Adámek"],
    Matyáš: ["Matýsek"],
    Vojtěch: ["Vojta", "Vojtíšek"],
    Filip: ["Filípek"],
    Ondřej: ["Ondra", "Ondrášek"],
    Lukáš: ["Lukášek"],
    David: ["Davídek"],
    Šimon: ["Šimonek", "Šimůnek"],
    Daniel: ["Daník", "Danek"],
    Martin: ["Martínek"],
    Antonín: ["Tonda", "Toník"],
    Josef: ["Pepa", "Pepík", "Josífek"],
    Michal: ["Míša", "Michálek"],
    Mikuláš: ["Mikulášek"],
    Jiří: ["Jirka", "Jiřík", "Jiříček"],
    František: ["Franta", "Frantík"],
    Václav: ["Vašek", "Venda", "Vašík"],
    Pavel: ["Pavlík", "Pája"],
    Karel: ["Karlík", "Kája"],
    Štěpán: ["Štěpánek"],
    Vít: ["Vítek"],
    Matouš: ["Matoušek"],
    Marek: ["Mareček"],
    Anna: ["Anička", "Andulka", "Anča"],
    Eliška: ["Elinka"],
    Tereza: ["Terezka", "Terka"],
    Adéla: ["Adélka"],
    Natálie: ["Natálka", "Náťa"],
    Sofie: ["Sofinka"],
    Karolína: ["Karolínka", "Kája"],
    Kristýna: ["Kristýnka", "Týna"],
    Barbora: ["Barborka", "Bára", "Barunka"],
    Viktorie: ["Viktorka"],
    Kateřina: ["Káťa", "Kačenka", "Kačka", "Katka"],
    Nela: ["Nelinka", "Nelča"],
    Julie: ["Julinka", "Julča"],
    Laura: ["Laurinka"],
    Veronika: ["Verunka", "Verča"],
    Klára: ["Klárka", "Klárinka"],
    Amálie: ["Amálka"],
    Rozálie: ["Rozálka", "Róza"],
    Ema: ["Emička", "Emča"],
    Marie: ["Maruška", "Majka", "Mařenka", "Máňa"],
    Magdaléna: ["Magda", "Madla", "Magdička"],
    Lucie: ["Lucinka", "Lucka"],
    Sára: ["Sárinka"],
    Hana: ["Hanička", "Hanka"],
    Jana: ["Janička", "Janča"],
    Petra: ["Petruška"],
    Zuzana: ["Zuzka", "Zuzanka"],
    Michaela: ["Míša", "Michalka"],
    Alžběta: ["Bětka", "Běta", "Alžbětka"],
    Johana: ["Johanka"],
    Lenka: ["Lenička"],
    Markéta: ["Markétka", "Máťa"],
    Monika: ["Monička"],
    Martina: ["Martinka"],
    Eva: ["Evička", "Evka"],
  },
};

/**
 * Výnimky s presnými tvarmi „N G D A V L I“ (medzera oddeľuje tvary).
 * `null` = nesklonné meno – kniha použije záložné vety (J5).
 * Kľúč „Meno|girl“ / „Meno|boy“ pre mená oboch rodov (Míša).
 */
export const OVERRIDES: Record<Lang, Record<string, { gender: Gender; forms: string | null }>> = {
  sk: {
    // Cudzie mená s nevyslovovaným/cudzím zakončením – v knihe ako nesklonné.
    Noah: { gender: "boy", forms: null },
    Zoe: { gender: "girl", forms: null },
    Chloe: { gender: "girl", forms: null },
    Emily: { gender: "girl", forms: null },
    Nelly: { gender: "girl", forms: null },
    Ellie: { gender: "girl", forms: null },
    Lily: { gender: "girl", forms: null },
    Naomi: { gender: "girl", forms: null },
    Tomi: { gender: "boy", forms: "Tomi Tomiho Tomimu Tomiho Tomi Tomim Tomim" },
    // Vkladné e / nepravidelné kmene.
    Pavol: { gender: "boy", forms: "Pavol Pavla Pavlovi Pavla Pavol Pavlovi Pavlom" },
    Peter: { gender: "boy", forms: "Peter Petra Petrovi Petra Peter Petrovi Petrom" },
  },
  cs: {
    Noah: { gender: "boy", forms: null },
    Zoe: { gender: "girl", forms: null },
    Chloe: { gender: "girl", forms: null },
    Emily: { gender: "girl", forms: null },
    Ellie: { gender: "girl", forms: null },
    Lily: { gender: "girl", forms: null },
    Naomi: { gender: "girl", forms: null },
    Madlen: { gender: "girl", forms: null },
    Vivien: { gender: "girl", forms: null },
    Nikol: { gender: "girl", forms: null },
    Jiří: { gender: "boy", forms: "Jiří Jiřího Jiřímu Jiřího Jiří Jiřím Jiřím" },
    // Opravy chýb v zdroji (Wikislovník uvádza A = „Aleš“, pri Ester nejednotné tvary).
    Aleš: { gender: "boy", forms: "Aleš Aleše Alešovi Aleše Aleši Alešovi Alešem" },
    Ester: { gender: "girl", forms: null },
    "Míša|girl": { gender: "girl", forms: "Míša Míši Míše Míšu Míšo Míše Míšou" },
    Karel: { gender: "boy", forms: "Karel Karla Karlovi Karla Karle Karlovi Karlem" },
    Pavel: { gender: "boy", forms: "Pavel Pavla Pavlovi Pavla Pavle Pavlovi Pavlem" },
  },
};
