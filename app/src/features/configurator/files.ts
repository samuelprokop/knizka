/** Adresa súkromného súboru projektu (fotka, Karta, strana) – route handler overí prístup. */
export const fileUrl = (market: string, projectId: string, kind: "foto" | "karta" | "strana", ref: string) =>
  `/${market}/kniha/${projectId}/subor/${kind}/${encodeURIComponent(ref)}`;
