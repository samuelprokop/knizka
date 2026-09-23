import { notFound } from "next/navigation";

import { NameReviewDetail } from "@/features/admin/components/NameReviewDetail";
import { PageHeader } from "@/features/admin/components/ui";
import { getNameReviewTask } from "@/features/admin/server/names";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function NameReviewTaskPage({ params }: PageProps<"/admin/slovnik/fronta/[taskId]">) {
  await requireAdminPage("slovnik");
  const { taskId } = await params;
  const task = await getNameReviewTask(taskId);
  if (!task) notFound();

  return (
    <div>
      <PageHeader title={`Jazyková kontrola – ${task.name}`} />
      <NameReviewDetail
        task={{
          id: task.id,
          name: task.name,
          language: task.language,
          gender: task.gender,
          proposedForms: task.proposedForms as NameReviewDetailForms,
          customerForms: task.customerForms as NameReviewDetailForms | null,
          declinable: task.declinable,
        }}
      />
    </div>
  );
}

type NameReviewDetailForms = Record<"N" | "G" | "D" | "A" | "V" | "L" | "I", string>;
