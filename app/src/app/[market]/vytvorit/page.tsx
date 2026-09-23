import { priceView, WizardShell } from "@/features/configurator/components/WizardShell";
import { ChildStep } from "@/features/configurator/components/steps/ChildStep";
import { getMarketContext } from "@/i18n/server";

// Krok 1 „Dieťa“ pre novú knihu. Projekt sa založí až po kroku 1 (s e-mailom).
export default async function CreateBookPage() {
  const { market, t } = await getMarketContext();

  return (
    <WizardShell
      market={market}
      t={t}
      step={1}
      projectId={null}
      maxStep={1}
      hero={null}
      bookLanguage={market.bookLanguages[0]}
      price={priceView(market, t, { storyPath: "A", companionCount: 0, pageCount: 32, format: "A5", coloringBook: false })}
    >
      <ChildStep
        bookLanguages={market.bookLanguages}
        initial={{
          name: "",
          gender: null,
          age: null,
          bookLanguage: market.bookLanguages[0],
          occasion: null,
          forms: null,
          indeclinable: false,
        }}
      />
    </WizardShell>
  );
}
