import Link from "next/link";

import { getMarketContext } from "@/i18n/server";

// PLACEHOLDER – vstup do konfigurátora (krok 1 „Dieťa“). Implementuje balík A.
export default async function CreateBookPage() {
  const { market, t } = await getMarketContext();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-24">
      <p className="text-sm font-medium text-ink/50">{t("common.progress.step", { n: 1, total: 8, title: t("common.progress.child") })}</p>
      <h1 className="mt-2 font-heading text-4xl font-extrabold text-ink">{t("child.title")}</h1>
      <p className="mt-4 text-ink/60">Konfigurátor pripravujeme (balík A).</p>
      <Link href={`/${market.code}`} className="mt-10 text-sm font-medium text-brand-orange">
        ← {t("common.back")}
      </Link>
    </main>
  );
}
