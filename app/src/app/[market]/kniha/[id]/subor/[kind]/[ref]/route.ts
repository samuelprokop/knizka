import { NextResponse, type NextRequest } from "next/server";

import { loadBundle } from "@/features/configurator/server/bundle";
import { hasProjectSession } from "@/features/configurator/server/session";
import { storage } from "@/server/storage";

/*
  Súkromné súbory projektu (fotky, Karty, ilustrácie) – len pre zariadenie
  s prístupom k projektu. Kľúč v úložisku sa zákazníkovi nikdy neukazuje;
  adresa obsahuje len id záznamu, ktorý musí patriť k projektu.

  /subor/foto/<photoId>   /subor/karta/<cardId>~<slot>   /subor/strana/<pageId>
*/

const TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

export async function GET(_request: NextRequest, ctx: RouteContext<"/[market]/kniha/[id]/subor/[kind]/[ref]">) {
  const { id, kind, ref } = await ctx.params;
  if (!(await hasProjectSession(id))) return new NextResponse(null, { status: 403 });
  const bundle = await loadBundle(id);
  if (!bundle) return new NextResponse(null, { status: 404 });

  let key: string | null | undefined;
  if (kind === "foto") {
    key = bundle.photos.find((p) => p.id === ref)?.storageKey;
  } else if (kind === "karta") {
    const [cardId, slot] = ref.split("~");
    const images = bundle.cards.find((c) => c.id === cardId)?.images as Record<string, unknown> | null | undefined;
    const value = images?.[slot ?? "portrait"];
    key = typeof value === "string" ? value : null;
  } else if (kind === "strana") {
    key = bundle.pages.find((p) => p.id === ref)?.illustrationKey;
  }
  if (!key) return new NextResponse(null, { status: 404 });

  try {
    const data = await storage.get(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        // Fotky detí sa nesmú ukladať do zdieľaných cache (S5).
        "Cache-Control": kind === "foto" ? "private, no-store" : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        // SVG z mocku nesmie spúšťať skripty.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
