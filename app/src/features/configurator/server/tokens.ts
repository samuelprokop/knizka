import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
  Prístup k projektu bez registrácie (K1.5):
  - Odkaz v e-maile nesie jednorazový token; v DB je len jeho SHA-256
    (projects.accessTokenHash). Po použití sa token vymení, takže starý
    odkaz prestane platiť.
  - Zariadenie, ktoré projekt založilo alebo otvorilo odkaz, dostane
    podpísanú cookie (HMAC id projektu). Použitie odkazu na novom zariadení
    tak neodhlási pôvodné.
*/

export const generateLinkToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("Chýba SESSION_SECRET (aspoň 32 znakov).");
  // Len na vývoj – v produkcii musí byť nastavený vlastný kľúč.
  return "dev-only-session-secret-do-not-use-in-production";
}

export const signProjectSession = (projectId: string) =>
  createHmac("sha256", sessionSecret()).update(`project:${projectId}`).digest("base64url");

/** Porovnanie v konštantnom čase – bez úniku informácie cez dĺžku odpovede. */
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const verifyProjectSession = (projectId: string, value: string | undefined) =>
  !!value && safeEqual(value, signProjectSession(projectId));

export const verifyLinkToken = (token: string, storedHash: string | null) =>
  !!storedHash && safeEqual(hashToken(token), storedHash);
