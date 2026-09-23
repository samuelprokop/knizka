import "server-only";

import { cookies } from "next/headers";

import { isUiPreview } from "@/lib/ui-preview";

import { signProjectSession, verifyProjectSession } from "./tokens";

const cookieName = (projectId: string) => `kniha_${projectId}`;

/** Cookie prístupu k projektu – len v server action alebo route handleri. */
export async function grantProjectSession(projectId: string) {
  const store = await cookies();
  store.set(cookieName(projectId), signProjectSession(projectId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Rozpracovaný projekt sa maže po 30 dňoch bez aktivity (F).
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function hasProjectSession(projectId: string) {
  // Náhľad UI: ukážkové projekty sú otvorené bez odkazu z e-mailu.
  if (isUiPreview()) return true;
  const store = await cookies();
  return verifyProjectSession(projectId, store.get(cookieName(projectId))?.value);
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Bez prístupu k projektu");
  }
}

/** Každá server action nad projektom to volá ako prvé (akcie sú verejné POST koncové body). */
export async function assertProjectSession(projectId: string) {
  if (!(await hasProjectSession(projectId))) throw new AccessDeniedError();
}
