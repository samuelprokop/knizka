/*
  Štartovací slovník mien – malá vzorka na vývoj. Plný slovník (~1 500 mien
  na jazyk, J1) dodá jazykový balík a overí korektor; dovtedy verified = false.
  Poradie tvarov: N, G, D, A, V, L, I.
*/

import type { BookLanguage } from "@/i18n/locales";
import type { Gender, NameForms } from "./types";

type SeedName = {
  language: BookLanguage;
  gender: Gender;
  forms: NameForms;
  declinable?: boolean;
  diminutives?: string[];
  baseName?: string;
};

const f = (forms: string): NameForms => {
  const [N, G, D, A, V, L, I] = forms.split(" ");
  return { N, G, D, A, V, L, I };
};

const indeclinable = (name: string): NameForms => f(Array(7).fill(name).join(" "));

export const SEED_NAMES: SeedName[] = [
  // ---------------------------------------------------------- slovenčina, dievčatá
  { language: "sk", gender: "girl", forms: f("Anna Anny Anne Annu Anna Anne Annou"), diminutives: ["Anička", "Anka", "Aňa"] },
  { language: "sk", gender: "girl", forms: f("Anička Aničky Aničke Aničku Anička Aničke Aničkou"), baseName: "Anna" },
  { language: "sk", gender: "girl", forms: f("Ema Emy Eme Emu Ema Eme Emou"), diminutives: ["Emka", "Emička"] },
  { language: "sk", gender: "girl", forms: f("Emka Emky Emke Emku Emka Emke Emkou"), baseName: "Ema" },
  { language: "sk", gender: "girl", forms: f("Sofia Sofie Sofii Sofiu Sofia Sofii Sofiou"), diminutives: ["Sofinka", "Sofi"] },
  { language: "sk", gender: "girl", forms: f("Nina Niny Nine Ninu Nina Nine Ninou"), diminutives: ["Ninka"] },
  { language: "sk", gender: "girl", forms: f("Katarína Kataríny Kataríne Katarínu Katarína Kataríne Katarínou"), diminutives: ["Katka", "Katarínka"] },
  { language: "sk", gender: "girl", forms: f("Katka Katky Katke Katku Katka Katke Katkou"), baseName: "Katarína" },
  { language: "sk", gender: "girl", forms: f("Mia Mie Mii Miu Mia Mii Miou") },
  { language: "sk", gender: "girl", forms: indeclinable("Zoe"), declinable: false },
  // ---------------------------------------------------------- slovenčina, chlapci
  { language: "sk", gender: "boy", forms: f("Ján Jána Jánovi Jána Ján Jánovi Jánom"), diminutives: ["Janko", "Janík", "Jano"] },
  { language: "sk", gender: "boy", forms: f("Janko Janka Jankovi Janka Janko Jankovi Jankom"), baseName: "Ján" },
  { language: "sk", gender: "boy", forms: f("Jakub Jakuba Jakubovi Jakuba Jakub Jakubovi Jakubom"), diminutives: ["Kubko", "Kubo"] },
  { language: "sk", gender: "boy", forms: f("Peter Petra Petrovi Petra Peter Petrovi Petrom"), diminutives: ["Peťko", "Peťo"] },
  { language: "sk", gender: "boy", forms: f("Tomáš Tomáša Tomášovi Tomáša Tomáš Tomášovi Tomášom"), diminutives: ["Tomáško", "Tomi"] },
  { language: "sk", gender: "boy", forms: f("Samuel Samuela Samuelovi Samuela Samuel Samuelovi Samuelom"), diminutives: ["Samko", "Samo"] },
  { language: "sk", gender: "boy", forms: f("Samko Samka Samkovi Samka Samko Samkovi Samkom"), baseName: "Samuel" },
  { language: "sk", gender: "boy", forms: f("Matej Mateja Matejovi Mateja Matej Matejovi Matejom"), diminutives: ["Maťko", "Maťo"] },
  { language: "sk", gender: "boy", forms: f("Maťko Maťka Maťkovi Maťka Maťko Maťkovi Maťkom"), baseName: "Matej" },
  { language: "sk", gender: "boy", forms: f("Adam Adama Adamovi Adama Adam Adamovi Adamom"), diminutives: ["Adamko"] },
  { language: "sk", gender: "boy", forms: indeclinable("Noah"), declinable: false },

  // ---------------------------------------------------------- čeština, dívky
  { language: "cs", gender: "girl", forms: f("Anna Anny Anně Annu Anno Anně Annou"), diminutives: ["Anička", "Andulka"] },
  { language: "cs", gender: "girl", forms: f("Anička Aničky Aničce Aničku Aničko Aničce Aničkou"), baseName: "Anna" },
  { language: "cs", gender: "girl", forms: f("Eliška Elišky Elišce Elišku Eliško Elišce Eliškou") },
  { language: "cs", gender: "girl", forms: f("Tereza Terezy Tereze Terezu Terezo Tereze Terezou"), diminutives: ["Terezka"] },
  { language: "cs", gender: "girl", forms: f("Kateřina Kateřiny Kateřině Kateřinu Kateřino Kateřině Kateřinou"), diminutives: ["Káťa", "Kačenka"] },
  { language: "cs", gender: "girl", forms: f("Káťa Káti Kátě Káťu Káťo Kátě Káťou"), baseName: "Kateřina" },
  { language: "cs", gender: "girl", forms: f("Natálie Natálie Natálii Natálii Natálie Natálii Natálií"), diminutives: ["Natálka"] },
  { language: "cs", gender: "girl", forms: f("Adéla Adély Adéle Adélu Adélo Adéle Adélou"), diminutives: ["Adélka"] },
  { language: "cs", gender: "girl", forms: indeclinable("Zoe"), declinable: false },
  // ---------------------------------------------------------- čeština, chlapci
  { language: "cs", gender: "boy", forms: f("Jan Jana Janovi Jana Jane Janovi Janem"), diminutives: ["Honza", "Honzík", "Jeník"] },
  { language: "cs", gender: "boy", forms: f("Honza Honzy Honzovi Honzu Honzo Honzovi Honzou"), baseName: "Jan" },
  { language: "cs", gender: "boy", forms: f("Honzík Honzíka Honzíkovi Honzíka Honzíku Honzíkovi Honzíkem"), baseName: "Jan" },
  { language: "cs", gender: "boy", forms: f("Petr Petra Petrovi Petra Petře Petrovi Petrem"), diminutives: ["Péťa"] },
  { language: "cs", gender: "boy", forms: f("Tomáš Tomáše Tomášovi Tomáše Tomáši Tomášovi Tomášem"), diminutives: ["Tomášek"] },
  { language: "cs", gender: "boy", forms: f("Jakub Jakuba Jakubovi Jakuba Jakube Jakubovi Jakubem"), diminutives: ["Kuba", "Kubík"] },
  { language: "cs", gender: "boy", forms: f("Kuba Kuby Kubovi Kubu Kubo Kubovi Kubou"), baseName: "Jakub" },
  { language: "cs", gender: "boy", forms: f("Matyáš Matyáše Matyášovi Matyáše Matyáši Matyášovi Matyášem") },
  { language: "cs", gender: "boy", forms: f("Adam Adama Adamovi Adama Adame Adamovi Adamem") },
  { language: "cs", gender: "boy", forms: f("Vojtěch Vojtěcha Vojtěchovi Vojtěcha Vojtěchu Vojtěchovi Vojtěchem"), diminutives: ["Vojta"] },
  { language: "cs", gender: "boy", forms: indeclinable("Noah"), declinable: false },
];
