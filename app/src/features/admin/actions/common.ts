import "server-only";

import { isUiPreview, UI_PREVIEW_ADMIN_ERROR } from "@/lib/ui-preview";

import type { AdminModule } from "../server/roles";
import { AccessDeniedError, requireAdmin, type CurrentAdmin } from "../server/session";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Obal každej admin akcie: relácia a rola sa overujú vždy nanovo (akcie sú POST koncové body). */
export async function adminAction<T>(
  mod: AdminModule | undefined,
  run: (admin: CurrentAdmin) => Promise<T>,
  /** readOnly: akcia nič nemení (kontrola, náhľad) – beží aj v náhľade UI. */
  opts: { readOnly?: boolean } = {}
): Promise<ActionResult<T>> {
  if (isUiPreview() && !opts.readOnly) return { ok: false, error: UI_PREVIEW_ADMIN_ERROR };
  try {
    const admin = await requireAdmin(mod);
    return { ok: true, data: await run(admin) };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    if (error instanceof Error) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Nastala neočakávaná chyba." };
  }
}
