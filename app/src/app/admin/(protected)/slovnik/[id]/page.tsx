import { notFound } from "next/navigation";

import { NameEntryForm } from "@/features/admin/components/NameEntryForm";
import { PageHeader } from "@/features/admin/components/ui";
import { getNameEntry } from "@/features/admin/server/names";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function EditNamePage({ params }: PageProps<"/admin/slovnik/[id]">) {
  await requireAdminPage("slovnik");
  const { id } = await params;
  const entry = await getNameEntry(id);
  if (!entry) notFound();

  return (
    <div>
      <PageHeader title={`Upraviť meno „${entry.name}“`} />
      <NameEntryForm
        initial={{
          language: entry.language as "sk" | "cs",
          name: entry.name,
          gender: entry.gender,
          forms: entry.forms as Record<"N" | "G" | "D" | "A" | "V" | "L" | "I", string>,
          declinable: entry.declinable,
          diminutives: entry.diminutives,
          baseName: entry.baseName,
        }}
      />
    </div>
  );
}
