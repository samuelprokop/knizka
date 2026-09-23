import { NewStoryForm } from "@/features/admin/components/NewStoryForm";
import { PageHeader } from "@/features/admin/components/ui";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function NewStoryPage() {
  await requireAdminPage("pribehy");
  return (
    <div>
      <PageHeader title="Nový príbeh" description="Po vytvorení napíšte edíciu v SK aj CZ, kým bude príbeh publikovateľný." />
      <NewStoryForm />
    </div>
  );
}
