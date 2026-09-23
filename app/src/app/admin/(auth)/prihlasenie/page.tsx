import { redirect } from "next/navigation";

import { LoginForm } from "@/features/admin/components/LoginForm";
import { currentAdmin } from "@/features/admin/server/session";
import { isUiPreview } from "@/lib/ui-preview";

export default async function LoginPage() {
  // V náhľade UI je správca prihlásený vždy – prihlasovaciu stránku ukážeme aj tak.
  if (!isUiPreview() && (await currentAdmin())) redirect("/admin");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-orange-dark">TAKTIK</p>
        <h1 className="text-xl font-semibold text-ink">Administrácia</h1>
      </div>
      <LoginForm />
    </div>
  );
}
