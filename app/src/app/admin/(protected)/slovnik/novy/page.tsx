import { CASE_KEYS } from "@/lib/language";
import { NameEntryForm } from "@/features/admin/components/NameEntryForm";
import { PageHeader } from "@/features/admin/components/ui";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function NewNamePage() {
  await requireAdminPage("slovnik");
  const emptyForms = Object.fromEntries(CASE_KEYS.map((key) => [key, ""])) as Record<(typeof CASE_KEYS)[number], string>;

  return (
    <div>
      <PageHeader title="Pridať meno do slovníka" />
      <NameEntryForm
        initial={{ language: "sk", name: "", gender: "girl", forms: emptyForms, declinable: true, diminutives: [], baseName: null }}
      />
    </div>
  );
}
