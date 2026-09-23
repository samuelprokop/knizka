import Link from "next/link";

import { isBookLanguage } from "@/i18n/locales";
import { Badge, Button, PageHeader } from "@/features/admin/components/ui";
import { listNameDictionary } from "@/features/admin/server/names";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function DictionaryPage({ searchParams }: PageProps<"/admin/slovnik">) {
  await requireAdminPage("slovnik");
  const params = await searchParams;
  const language = typeof params.jazyk === "string" && isBookLanguage(params.jazyk) ? params.jazyk : undefined;
  const search = typeof params.hladat === "string" ? params.hladat : undefined;
  const page = Number(params.strana) || 1;

  const { entries, total } = await listNameDictionary({ language, search, page });

  return (
    <div>
      <PageHeader
        title="Slovník mien"
        description={`${total} záznamov`}
        actions={
          <div className="flex gap-2">
            <Link href="/admin/slovnik/fronta">
              <Button variant="secondary">Fronta jazykovej kontroly</Button>
            </Link>
            <Link href="/admin/slovnik/novy">
              <Button>Pridať meno</Button>
            </Link>
          </div>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input
          name="hladat"
          defaultValue={search}
          placeholder="Hľadať meno…"
          className="min-h-10 rounded-lg border border-ink/20 px-3 text-sm"
        />
        <select name="jazyk" defaultValue={language ?? ""} className="min-h-10 rounded-lg border border-ink/20 px-3 text-sm">
          <option value="">všetky jazyky</option>
          <option value="sk">sk</option>
          <option value="cs">cs</option>
        </select>
        <Button type="submit" variant="secondary">
          Filtrovať
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Meno</th>
              <th className="px-3 py-2 font-medium">Jazyk</th>
              <th className="px-3 py-2 font-medium">Rod</th>
              <th className="px-3 py-2 font-medium">Sklonné</th>
              <th className="px-3 py-2 font-medium">Overené</th>
              <th className="px-3 py-2 font-medium">Zdroj</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{entry.name}</td>
                <td className="px-3 py-2 text-ink/70">{entry.language}</td>
                <td className="px-3 py-2 text-ink/70">{entry.gender === "girl" ? "dievča" : "chlapec"}</td>
                <td className="px-3 py-2 text-ink/70">{entry.declinable ? "áno" : "nie"}</td>
                <td className="px-3 py-2">{entry.verified ? <Badge tone="success">overené</Badge> : <Badge tone="warning">neoverené</Badge>}</td>
                <td className="px-3 py-2 text-ink/50">{entry.source}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/slovnik/${entry.id}`} className="text-brand-orange-dark hover:underline">
                    Upraviť
                  </Link>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ink/50">
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
