import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { MarketCode } from "@/config/markets";
import type { Book, BookImage } from "../model/types";
import { isServableKey } from "../storage-keys";

/*
  Krátkodobé podpísané odkazy na obrázky knihy (S5). Úložisko je mimo public/,
  prehliadač dostane len URL s platnosťou a podpisom. Fotky detí (photos/) sa
  touto cestou nikdy nevydávajú – ani s platným podpisom.
*/

export { isServableKey } from "../storage-keys";

const DEFAULT_TTL_SECONDS = 60 * 60;

function secret(): string {
  const configured = process.env.MEDIA_URL_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("Chýba MEDIA_URL_SECRET");
  // Vývoj: náhodný kľúč pre proces (prežije HMR); po reštarte staré odkazy vypršia.
  const g = globalThis as unknown as { mediaUrlSecret?: string };
  g.mediaUrlSecret ??= randomBytes(32).toString("hex");
  return g.mediaUrlSecret;
}

const sign = (key: string, expires: number, width: number) =>
  createHmac("sha256", secret()).update(`${key}\n${expires}\n${width}`).digest("base64url");

/**
 * URL obrázka pre náhľad. `width` = zmenšenie na strane servera (znížené rozlíšenie
 * náhľadu, K8.1); 0 = originál.
 */
export function signedMediaUrl(market: MarketCode, key: string, options: { width?: number; ttlSeconds?: number } = {}) {
  if (!isServableKey(key)) throw new Error(`Kľúč nie je určený na zobrazenie: ${key}`);
  const expires = Math.floor(Date.now() / 1000) + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const width = options.width ?? 0;
  const params = new URLSearchParams({ k: key, e: String(expires), w: String(width), s: sign(key, expires, width) });
  return `/${market}/nahlad/obrazok?${params}`;
}

export function verifyMediaRequest(params: URLSearchParams): { key: string; width: number } | null {
  const key = params.get("k") ?? "";
  const expires = Number(params.get("e"));
  const width = Number(params.get("w") ?? 0);
  const signature = params.get("s") ?? "";
  if (!isServableKey(key) || !Number.isFinite(expires) || !Number.isInteger(width) || width < 0) return null;
  if (expires < Date.now() / 1000) return null;
  const expected = Buffer.from(sign(key, expires, width));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { key, width };
}

/** Šírka obrázkov v náhľade – znížené rozlíšenie oproti tlači (2 550 px na stranu). */
export const PREVIEW_IMAGE_WIDTH = 1000;

/** Doplní do knihy podpísané URL všetkých obrázkov (náhľad v prehliadači). */
export function withSignedImages(book: Book, market: MarketCode, width = PREVIEW_IMAGE_WIDTH): Book {
  const cache = new Map<string, string>();
  const resolve = (image: BookImage | null): BookImage | null => {
    if (!image) return null;
    if (!isServableKey(image.key)) return { key: image.key };
    let src = cache.get(image.key);
    if (!src) {
      src = signedMediaUrl(market, image.key, { width });
      cache.set(image.key, src);
    }
    return { ...image, src };
  };
  return {
    ...book,
    cover: {
      ...book.cover,
      hero: resolve(book.cover.hero),
      portrait: resolve(book.cover.portrait),
      scene: resolve(book.cover.scene),
    },
    back: { ...book.back, portrait: resolve(book.back.portrait) },
    parts: book.parts.map((part) =>
      part.kind === "story_spread" ? { ...part, illustration: resolve(part.illustration) } : part
    ),
  };
}
