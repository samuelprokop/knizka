import Link from "next/link";
import { notFound } from "next/navigation";

import { isUiPreview } from "@/lib/ui-preview";
import { ToastDemo } from "./ToastDemo";

/* Katalóg UI: notifikácie (toasty) – na mobile hore, od tabletu vpravo dole. */
export default function ToastsPage() {
  if (!isUiPreview()) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/ui" className="text-sm font-medium text-brand-orange-dark">← Katalóg obrazoviek</Link>
      <h1 className="mt-2 mb-3 font-heading text-4xl font-extrabold">Notifikácie</h1>
      <p className="mb-8 max-w-xl text-ink/70">
        Krátke potvrdenia (odkaz odoslaný, podoba schválená). Zmiznú po 5 sekundách, pri prejdení myšou čakajú.
      </p>
      <ToastDemo />
    </main>
  );
}
