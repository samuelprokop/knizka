"use server";

import { revalidatePath } from "next/cache";

import { db, schema } from "@/db";
import { ADMIN_ROLES, type AdminRole } from "../server/roles";
import { inviteAdminUser, resetAdminUserPassword, setAdminUserActive } from "../server/users";
import { adminAction, type ActionResult } from "./common";

export async function inviteAdminUserAction(input: { email: string; name: string; role: string }): Promise<ActionResult<{ tempPassword: string }>> {
  return adminAction("pouzivatelia", async (admin) => {
    if (!input.email.trim() || !input.name.trim()) throw new Error("Vyplňte e-mail aj meno.");
    if (!(ADMIN_ROLES as readonly string[]).includes(input.role)) throw new Error("Neznáma rola.");
    const result = await inviteAdminUser({ email: input.email, name: input.name, role: input.role as AdminRole });
    await db.insert(schema.auditLog).values({ actor: admin.email, action: "admin_user.invite", subjectType: "admin_user", subjectId: input.email.trim().toLowerCase() });
    revalidatePath("/admin/pouzivatelia");
    return result;
  });
}

export async function setAdminUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  return adminAction("pouzivatelia", async (admin) => {
    await setAdminUserActive(userId, active);
    await db.insert(schema.auditLog).values({ actor: admin.email, action: active ? "admin_user.activate" : "admin_user.deactivate", subjectType: "admin_user", subjectId: userId });
    revalidatePath("/admin/pouzivatelia");
  });
}

export async function resetAdminUserPasswordAction(userId: string): Promise<ActionResult<{ tempPassword: string }>> {
  return adminAction("pouzivatelia", async (admin) => {
    const result = await resetAdminUserPassword(userId);
    await db.insert(schema.auditLog).values({ actor: admin.email, action: "admin_user.reset_password", subjectType: "admin_user", subjectId: userId });
    revalidatePath("/admin/pouzivatelia");
    return result;
  });
}
