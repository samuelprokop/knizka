import type { schema } from "@/db";

/*
  Prístup podľa roly (špecifikácia: Administrácia – Roly). "admin" má vždy
  prístup ku všetkému, ostatné roly len k modulom zo svojho stĺpca "Prístup".
*/

export type AdminRole = (typeof schema.adminRole.enumValues)[number];

export const ADMIN_ROLES: AdminRole[] = [
  "content_editor",
  "graphic",
  "support",
  "production",
  "market_admin",
  "art_director",
  "admin",
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  content_editor: "Redaktor obsahu",
  graphic: "Grafik",
  support: "Podpora",
  production: "Výroba",
  market_admin: "Správca trhu",
  art_director: "Art director a produkčný grafik",
  admin: "Administrátor",
};

export type AdminModule = "pribehy" | "slovnik" | "fronta" | "trh" | "audit" | "pouzivatelia";

export const MODULE_LABELS: Record<AdminModule, string> = {
  pribehy: "Knižnica príbehov",
  slovnik: "Slovník mien",
  fronta: "Fronta grafika a redaktora",
  trh: "Nastavenia trhu",
  audit: "Audit",
  pouzivatelia: "Používatelia",
};

const MODULE_ACCESS: Record<AdminModule, AdminRole[]> = {
  pribehy: ["content_editor", "admin"],
  slovnik: ["content_editor", "admin"],
  fronta: ["graphic", "content_editor", "admin"],
  trh: ["market_admin", "admin"],
  audit: ["admin"],
  pouzivatelia: ["admin"],
};

export const canAccess = (role: AdminRole, mod: AdminModule) => MODULE_ACCESS[mod].includes(role);

export const accessibleModules = (role: AdminRole): AdminModule[] =>
  (Object.keys(MODULE_ACCESS) as AdminModule[]).filter((mod) => canAccess(role, mod));
