import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckoutSkeleton, WizardSkeleton } from "@/components/PageSkeletons";
import { isUiPreview } from "@/lib/ui-preview";
import { SkeletonDemo } from "./SkeletonDemo";

/* Katalóg UI: skeleton komponent a kostry stránok, ktoré sa inak ukážu len krátko pri načítaní. */
export default async function LoadingStatesPage({ searchParams }: PageProps<"/ui/nacitavanie">) {
  if (!isUiPreview()) notFound();
  const { kostra } = await searchParams;
  if (kostra === "konfigurator") return <WizardSkeleton label="Načítava sa" />;
  if (kostra === "kosik") return <CheckoutSkeleton label="Načítava sa" />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/ui" className="text-sm font-medium text-brand-orange-dark">← Katalóg obrazoviek</Link>
      <h1 className="mt-2 mb-8 font-heading text-4xl font-extrabold">Načítavanie (skeleton)</h1>
      <SkeletonDemo />
    </main>
  );
}
