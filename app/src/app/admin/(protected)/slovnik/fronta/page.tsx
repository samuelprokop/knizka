import Link from "next/link";

import { Badge, PageHeader } from "@/features/admin/components/ui";
import { listNameReviews } from "@/features/admin/server/names";
import { requireAdminPage } from "@/features/admin/server/session";

const STATUS_LABEL: Record<string, string> = { pending: "Čaká", approved: "Schválené", rejected: "Zamietnuté" };

export default async function NameReviewQueuePage() {
  await requireAdminPage("slovnik");
  const tasks = await listNameReviews({ limit: 200 });

  return (
    <div>
      <PageHeader
        title="Fronta jazykovej kontroly"
        description="Meno mimo slovníka alebo s neoverenými tvarmi – kniha nejde do tlače, kým úloha nie je vybavená (J4)."
      />
      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Meno</th>
              <th className="px-3 py-2 font-medium">Jazyk</th>
              <th className="px-3 py-2 font-medium">Rod</th>
              <th className="px-3 py-2 font-medium">Zadané zákazníkom</th>
              <th className="px-3 py-2 font-medium">Stav</th>
              <th className="px-3 py-2 font-medium">Vytvorené</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{task.name}</td>
                <td className="px-3 py-2 text-ink/70">{task.language}</td>
                <td className="px-3 py-2 text-ink/70">{task.gender === "girl" ? "dievča" : "chlapec"}</td>
                <td className="px-3 py-2 text-ink/70">{task.customerForms ? "áno" : "nie"}</td>
                <td className="px-3 py-2">
                  <Badge tone={task.status === "pending" ? "warning" : task.status === "rejected" ? "danger" : "success"}>
                    {STATUS_LABEL[task.status]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-ink/50">{new Date(task.createdAt).toLocaleString("sk-SK")}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/slovnik/fronta/${task.id}`} className="text-brand-orange-dark hover:underline">
                    Otvoriť
                  </Link>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ink/50">
                  Fronta je prázdna.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
