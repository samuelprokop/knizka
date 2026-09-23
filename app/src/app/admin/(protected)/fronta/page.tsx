import Link from "next/link";

import { Badge, PageHeader } from "@/features/admin/components/ui";
import { listReviewQueue } from "@/features/admin/server/queue";
import { requireAdminPage } from "@/features/admin/server/session";

const STATUS_LABEL: Record<string, string> = { paid: "Zaplatené", in_review: "V kontrole", fixing: "Vrátené na opravu" };

export default async function QueuePage() {
  await requireAdminPage("fronta");
  const items = await listReviewQueue();

  return (
    <div>
      <PageHeader title="Fronta grafika a redaktora" description="Knihy pred tlačou – kontrola 100 % kníh (I12)." />
      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Hrdina</th>
              <th className="px-3 py-2 font-medium">Trh</th>
              <th className="px-3 py-2 font-medium">Stav</th>
              <th className="px-3 py-2 font-medium">Rizikové strany</th>
              <th className="px-3 py-2 font-medium">Hlásenia zákazníka</th>
              <th className="px-3 py-2 font-medium">Upravené zákazníkom</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.projectId} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{item.heroName}</td>
                <td className="px-3 py-2 text-ink/70">{item.market}</td>
                <td className="px-3 py-2">
                  <Badge tone={item.status === "fixing" ? "warning" : "neutral"}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
                </td>
                <td className="px-3 py-2">{item.flaggedPages > 0 ? <Badge tone="danger">{item.flaggedPages}</Badge> : "0"}</td>
                <td className="px-3 py-2">{item.reportedPages > 0 ? <Badge tone="warning">{item.reportedPages}</Badge> : "0"}</td>
                <td className="px-3 py-2">{item.editedPages}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/fronta/${item.projectId}`} className="text-brand-orange-dark hover:underline">
                    Otvoriť
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
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
