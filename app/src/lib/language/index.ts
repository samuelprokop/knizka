/*
  Jazykový modul – verejné rozhranie. Serverové vyhľadanie v slovníku je
  v ./resolve (import "@/lib/language/resolve"), aby sa dal tento súbor
  použiť aj v klientských komponentoch.
*/

export * from "./types";
export { guessNameForms } from "./rules";
export { applyTypography, renderNameTokens, usesInflectedName } from "./render";
