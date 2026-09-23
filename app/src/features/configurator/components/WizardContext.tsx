"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { NameContext } from "@/lib/language";

export type PriceView = {
  total: string;
  lines: { label: string; amount: string }[];
};

export type WizardValue = {
  market: string;
  projectId: string | null;
  price: PriceView;
  /** Tvary mena hrdinu na dosadenie do textov ({meno:A} …). */
  hero: NameContext | null;
  bookLanguage: string;
};

const Ctx = createContext<WizardValue | null>(null);

export function WizardProvider({ value, children }: { value: WizardValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWizard musí byť vnútri <WizardProvider>");
  return value;
}
