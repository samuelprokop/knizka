import "server-only";

import { headers } from "next/headers";

import type { MessageKey } from "@/i18n/messages";
import { isUiPreview, UI_PREVIEW_ERROR } from "@/lib/ui-preview";
import { AccessDeniedError, assertProjectSession } from "../server/session";
import { ValidationError } from "../server/projects";
import { ProjectLockedError } from "../status";

/** Výsledok akcie pre klienta: chyba je vždy kľúč textu, nikdy technická hláška. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: MessageKey };

function toErrorKey(error: unknown): MessageKey {
  if (error instanceof ValidationError) return error.key as MessageKey;
  if (error instanceof AccessDeniedError) return "error.session_expired";
  if (error instanceof ProjectLockedError) return "editor.preparing";
  console.error(error);
  return "error.generic";
}

/**
 * Obal každej akcie nad projektom: akcie sú verejné POST koncové body,
 * preto sa prístup overuje vždy znova (nie podľa toho, čo UI zobrazilo).
 */
export async function projectAction<T>(projectId: unknown, run: (projectId: string) => Promise<T>): Promise<ActionResult<T>> {
  if (isUiPreview()) return { ok: false, error: UI_PREVIEW_ERROR };
  try {
    if (typeof projectId !== "string") throw new AccessDeniedError();
    await assertProjectSession(projectId);
    return { ok: true, data: await run(projectId) };
  } catch (error) {
    return { ok: false, error: toErrorKey(error) };
  }
}

export async function publicAction<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  if (isUiPreview()) return { ok: false, error: UI_PREVIEW_ERROR };
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: toErrorKey(error) };
  }
}

/** Adresa, z ktorej zákazník prišiel – pre odkaz v e-maile. */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function userAgent() {
  return (await headers()).get("user-agent");
}
