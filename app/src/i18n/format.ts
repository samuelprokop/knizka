import { renderNameTokens, type NameContext } from "@/lib/language";
import { MESSAGES, type MessageKey } from "./messages";
import type { BookLanguage } from "./locales";

export type MessageVars = Record<string, string | number>;

/** Dosadí {premenné} a značky mena {meno:X} / {rod:a|b}. Neznáma premenná ostane viditeľná. */
export function formatMessage(template: string, vars?: MessageVars, name?: NameContext) {
  const withName = name ? renderNameTokens(template, name) : template;
  if (!vars) return withName;
  return withName.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export type Translator = (key: MessageKey, vars?: MessageVars, name?: NameContext) => string;

export function createTranslator(language: BookLanguage): Translator {
  const messages = MESSAGES[language];
  return (key, vars, name) => formatMessage(messages[key] ?? key, vars, name);
}
