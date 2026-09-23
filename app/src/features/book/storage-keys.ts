/*
  Priestory úložiska, ktoré smie renderer knihy zobraziť alebo vložiť do PDF.
  Fotky detí (photos/) medzi nimi nikdy nie sú (S5).
*/

export const SERVABLE_PREFIXES = ["mock/", "scenes/", "pages/", "cards/"] as const;

export const isServableKey = (key: string) =>
  SERVABLE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !key.includes("..") && !key.includes("\\");

const CONTENT_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const imageContentType = (key: string): string | undefined =>
  CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""];
