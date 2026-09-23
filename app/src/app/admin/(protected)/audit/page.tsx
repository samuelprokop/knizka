import { PageHeader } from "@/features/admin/components/ui";
import { listAuditLog } from "@/features/admin/server/audit";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdminPage("audit");
  const params = await searchParams;
  const actor = typeof params.aktor === "string" ? params.aktor : undefined;

  const entries = await listAuditLog({ actor });

  return (
    <div>
      <PageHeader title="Audit" description="Citlivé akcie a zobrazenia fotiek (posledných 200 záznamov)." />

      <form className="mb-4 flex gap-2" method="get">
        <input
          name="aktor"
          defaultValue={actor}
          placeholder="Filtrovať podľa aktéra (e-mail)…"
          className="min-h-10 w-72 rounded-lg border border-ink/20 px-3 text-sm"
        />
        <button type="submit" className="rounded-lg border border-ink/20 px-4 text-sm font-medium text-ink hover:border-ink/40">
          Filtrovať
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Kedy</th>
              <th className="px-3 py-2 font-medium">Aktér</th>
              <th className="px-3 py-2 font-medium">Akcia</th>
              <th className="px-3 py-2 font-medium">Predmet</th>
              <th className="px-3 py-2 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-ink/50">{new Date(entry.createdAt).toLocaleString("sk-SK")}</td>
                <td className="px-3 py-2 text-ink/80">{entry.actor}</td>
                <td className="px-3 py-2 font-medium text-ink">{entry.action}</td>
                <td className="px-3 py-2 text-ink/60">
                  {entry.subjectType}
                  {entry.subjectId ? ` · ${entry.subjectId}` : ""}
                </td>
                <td className="px-3 py-2 text-ink/60">{entry.reason}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink/50">
                  Žiadne záznamy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
