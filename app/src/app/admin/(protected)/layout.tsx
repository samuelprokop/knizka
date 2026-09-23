import { redirect } from "next/navigation";

import { Nav } from "@/features/admin/components/Nav";
import { currentAdmin } from "@/features/admin/server/session";

export default async function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/prihlasenie");

  return (
    <div className="min-h-dvh">
      <Nav admin={admin} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
