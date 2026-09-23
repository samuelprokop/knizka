"use server";

import { redirect } from "next/navigation";

import { db, schema } from "@/db";
import { AccountDisabledError, authenticate, InvalidCredentialsError } from "../server/auth";
import { createSession, currentAdmin, destroySession } from "../server/session";
import { isUiPreview, UI_PREVIEW_ADMIN_ERROR } from "@/lib/ui-preview";

import type { ActionResult } from "./common";

export async function loginAction(email: string, password: string): Promise<ActionResult> {
  if (isUiPreview()) return { ok: false, error: UI_PREVIEW_ADMIN_ERROR };
  try {
    const user = await authenticate(email, password);
    await createSession(user);
    await db.insert(schema.auditLog).values({ actor: user.email, action: "admin.login", subjectType: "admin_user", subjectId: user.id });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof InvalidCredentialsError || error instanceof AccountDisabledError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "Nastala neočakávaná chyba." };
  }
}

export async function logoutAction(): Promise<void> {
  if (isUiPreview()) redirect("/admin");
  const admin = await currentAdmin();
  if (admin) await db.insert(schema.auditLog).values({ actor: admin.email, action: "admin.logout", subjectType: "admin_user", subjectId: admin.id });
  await destroySession();
  redirect("/admin/prihlasenie");
}
