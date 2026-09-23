import { PageHeader } from "@/features/admin/components/ui";
import { UsersManager } from "@/features/admin/components/UsersManager";
import { listAdminUsers } from "@/features/admin/server/users";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function UsersPage() {
  await requireAdminPage("pouzivatelia");
  const users = await listAdminUsers();

  return (
    <div>
      <PageHeader title="Používatelia" description="Interní používatelia a ich roly. Dvojfaktorové prihlásenie zatiaľ nie je zapojené (navrhnuté v schéme, príde neskôr)." />
      <UsersManager
        users={users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
