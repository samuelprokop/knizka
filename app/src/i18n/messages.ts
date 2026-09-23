/*
  Texty rozhrania – zdroj je Slovník mikrotextov (analyza/04_…pdf), prevedený
  do messages/sk.json a messages/cs.json. Kľúč je rovnaký v oboch jazykoch.
  Nový text: pridať kľúč do OBOCH súborov (typ MessageKey to vynúti pri sk).
*/

import cs from "./messages/cs.json";
import sk from "./messages/sk.json";
import type { BookLanguage } from "./locales";

export type MessageKey = keyof typeof sk;
export type Messages = Record<MessageKey, string>;

// cs.json musí mať presne tie isté kľúče ako sk.json.
const csChecked: Messages = cs satisfies Record<MessageKey, string>;

export const MESSAGES: Record<BookLanguage, Messages> = { sk, cs: csChecked };
