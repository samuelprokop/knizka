import Link from "next/link";
import { notFound } from "next/navigation";

import { isUiPreview } from "@/lib/ui-preview";
import { AnimationsDemo } from "./AnimationsDemo";

/* Katalóg UI: animácie, ktoré sa v náhľade inak nedajú spustiť (akcie sa neukladajú). */
export default function AnimationsPage() {
  if (!isUiPreview()) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/ui" className="text-sm font-medium text-brand-orange-dark">← Katalóg obrazoviek</Link>
      <h1 className="mt-2 mb-3 font-heading text-4xl font-extrabold">Animácie</h1>
      <p className="mb-8 max-w-xl text-ink/70">Vloženie knihy do košíka po schválení (v konfigurátore potom nasleduje košík).</p>
      <AnimationsDemo />
    </main>
  );
}
