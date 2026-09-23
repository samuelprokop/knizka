import Link from "next/link";

import { logoutAction } from "../actions/auth";
import { accessibleModules, MODULE_LABELS, ROLE_LABELS, type AdminRole } from "../server/roles";
import type { CurrentAdmin } from "../server/session";

const MODULE_HREF: Record<string, string> = {
  pribehy: "/admin/pribehy",
  slovnik: "/admin/slovnik",
  fronta: "/admin/fronta",
  trh: "/admin/trh",
  audit: "/admin/audit",
  pouzivatelia: "/admin/pouzivatelia",
};

export function Nav({ admin }: { admin: CurrentAdmin }) {
  const modules = accessibleModules(admin.role);
  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/admin" className="text-sm font-semibold text-ink">
          TAKTIK · Administrácia
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {modules.map((mod) => (
            <Link key={mod} href={MODULE_HREF[mod]} className="rounded-lg px-3 py-1.5 text-ink/70 hover:bg-ink/5 hover:text-ink">
              {MODULE_LABELS[mod]}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-ink/60">
          <span>
            {admin.name} · {ROLE_LABELS[admin.role as AdminRole]}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="text-ink/60 underline-offset-4 hover:text-ink hover:underline">
              Odhlásiť sa
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
