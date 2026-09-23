import Link from "next/link";

import { accessibleModules, MODULE_LABELS } from "@/features/admin/server/roles";
import { requireAdminPage } from "@/features/admin/server/session";
import { PageHeader } from "@/features/admin/components/ui";

const MODULE_HREF: Record<string, string> = {
  pribehy: "/admin/pribehy",
  slovnik: "/admin/slovnik",
  fronta: "/admin/fronta",
  trh: "/admin/trh",
  audit: "/admin/audit",
  pouzivatelia: "/admin/pouzivatelia",
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  pribehy: "Editor edícií po dvojstranách, kontrola dĺžky textu, publikovanie s verziou.",
  slovnik: "Tvary mien a fronta jazykovej kontroly zo slovníka.",
  fronta: "Knihy pred tlačou – dvojstrany vedľa Kariet, schválenie alebo vrátenie s poznámkou.",
  trh: "Konfigurácia trhu a katalógu (zatiaľ na čítanie).",
  audit: "Záznam citlivých akcií a zobrazení fotiek.",
  pouzivatelia: "Interní používatelia a ich roly.",
};

export default async function AdminHome() {
  const admin = await requireAdminPage();
  const modules = accessibleModules(admin.role);

  return (
    <div>
      <PageHeader title={`Vitajte, ${admin.name}`} description="Vyberte modul, ku ktorému máte prístup." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Link key={mod} href={MODULE_HREF[mod]} className="rounded-xl border border-ink/10 bg-white p-4 transition hover:border-brand-orange/50 hover:shadow-sm">
            <h2 className="font-semibold text-ink">{MODULE_LABELS[mod]}</h2>
            <p className="mt-1 text-sm text-ink/60">{MODULE_DESCRIPTIONS[mod]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
