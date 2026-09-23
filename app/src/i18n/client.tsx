"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { MarketCode } from "@/config/markets";
import { createTranslator, type Translator } from "./format";
import type { BookLanguage } from "./locales";

type I18nValue = { market: MarketCode; language: BookLanguage; t: Translator };

const I18nContext = createContext<I18nValue | null>(null);

/** Poskytuje prekladač klientským komponentom; nasadený v app/[market]/layout.tsx. */
export function I18nProvider({
  market,
  language,
  children,
}: {
  market: MarketCode;
  language: BookLanguage;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ market, language, t: createTranslator(language) }),
    [market, language]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n musí byť vnútri <I18nProvider>");
  return value;
}
