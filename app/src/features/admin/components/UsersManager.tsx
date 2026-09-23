"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { inviteAdminUserAction, resetAdminUserPasswordAction, setAdminUserActiveAction } from "../actions/users";
import { ADMIN_ROLES, ROLE_LABELS, type AdminRole } from "../server/roles";
import { Badge, Button, Field, Input, Notice, Select } from "./ui";

export type UserRow = { id: string; email: string; name: string; role: AdminRole; active: boolean; lastLoginAt: string | null };

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminRole>("content_editor");
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const invite = () => {
    setError(null);
    startTransition(async () => {
      const result = await inviteAdminUserAction({ email, name, role });
      if (!result.ok) return setError(result.error);
      setTempPassword({ email, password: result.data.tempPassword });
      setEmail("");
      setName("");
      router.refresh();
    });
  };

  const toggleActive = (user: UserRow) => {
    startTransition(async () => {
      await setAdminUserActiveAction(user.id, !user.active);
      router.refresh();
    });
  };

  const resetPassword = (user: UserRow) => {
    startTransition(async () => {
      const result = await resetAdminUserPasswordAction(user.id);
      if (result.ok) setTempPassword({ email: user.email, password: result.data.tempPassword });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-ink/10 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          invite();
        }}
      >
        <Field label="E-mail" htmlFor="new-email">
          <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Meno" htmlFor="new-name">
          <Input id="new-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Rola" htmlFor="new-role">
          <Select id="new-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" pending={pending}>
          Pozvať používateľa
        </Button>
      </form>

      {error && <Notice tone="error">{error}</Notice>}
      {tempPassword && (
        <Notice tone="success">
          Jednorazové heslo pre {tempPassword.email}: <code className="font-mono">{tempPassword.password}</code> – odovzdajte ho
          bezpečne, znova sa nezobrazí.
        </Notice>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Meno</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Rola</th>
              <th className="px-3 py-2 font-medium">Stav</th>
              <th className="px-3 py-2 font-medium">Posledné prihlásenie</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{user.name}</td>
                <td className="px-3 py-2 text-ink/70">{user.email}</td>
                <td className="px-3 py-2 text-ink/70">{ROLE_LABELS[user.role]}</td>
                <td className="px-3 py-2">
                  <Badge tone={user.active ? "success" : "neutral"}>{user.active ? "aktívny" : "deaktivovaný"}</Badge>
                </td>
                <td className="px-3 py-2 text-ink/50">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("sk-SK") : "nikdy"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => resetPassword(user)} className="mr-3 text-brand-orange-dark hover:underline">
                    Nové heslo
                  </button>
                  <button type="button" onClick={() => toggleActive(user)} className="text-brand-orange-dark hover:underline">
                    {user.active ? "Deaktivovať" : "Aktivovať"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
