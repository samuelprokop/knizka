import { notFound } from "next/navigation";

import { Badge, PageHeader } from "@/features/admin/components/ui";
import { QueueDetailActions } from "@/features/admin/components/QueueDetailActions";
import { getQueueDetail } from "@/features/admin/server/queue";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function QueueDetailPage({ params }: PageProps<"/admin/fronta/[projectId]">) {
  const admin = await requireAdminPage("fronta");
  const { projectId } = await params;
  const detail = await getQueueDetail(projectId, admin.email);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Kniha – ${detail.heroName}`} description={`Stav: ${detail.status}`} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Karty postáv</h2>
        <div className="flex flex-wrap gap-4">
          {detail.cards.map((card) => (
            <div key={card.characterId} className="w-32 rounded-lg border border-ink/10 bg-white p-2 text-center">
              {card.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.portraitUrl} alt={card.name} className="mb-1 aspect-square w-full rounded-md object-cover" />
              ) : (
                <div className="mb-1 flex aspect-square w-full items-center justify-center rounded-md bg-ink/5 text-xs text-ink/40">bez karty</div>
              )}
              <p className="text-xs font-medium text-ink">{card.name}</p>
              <p className="text-[10px] text-ink/50">{card.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Dvojstrany</h2>
        <div className="flex flex-col gap-3">
          {detail.pages.map((page) => (
            <div key={page.id} className="flex gap-4 rounded-xl border border-ink/10 bg-white p-3">
              <div className="w-28 shrink-0">
                {page.illustrationUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.illustrationUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-md bg-ink/5 text-xs text-ink/40">–</div>
                )}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink/50">Strana {page.position}</span>
                  {page.status === "needs_review" && <Badge tone="danger">rizikové</Badge>}
                  {page.editedByCustomer && <Badge tone="warning">upravené zákazníkom</Badge>}
                  {page.reports.length > 0 && <Badge tone="warning">{page.reports.length}× nahlásené</Badge>}
                </div>
                <p className="text-sm text-ink">{page.text}</p>
                {page.reports.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs text-ink/60">
                    {page.reports.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <QueueDetailActions projectId={detail.projectId} />
    </div>
  );
}
