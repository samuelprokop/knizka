import { verifyMediaRequest } from "@/features/book/server/media";
import { imageContentType } from "@/features/book/storage-keys";
import { storage } from "@/server/storage";

/*
  Obrázky knihy pre náhľad – len cez podpísanú krátkodobú URL (S5).
  Rastrové obrázky sa zmenšia na šírku z podpisu (znížené rozlíšenie, K8.1).
*/

export async function GET(request: Request) {
  const media = verifyMediaRequest(new URL(request.url).searchParams);
  if (!media) return new Response(null, { status: 403 });

  let contentType = imageContentType(media.key);
  if (!contentType) return new Response(null, { status: 415 });

  let body: Buffer;
  try {
    body = await storage.get(media.key);
  } catch {
    return new Response(null, { status: 404 });
  }

  if (media.width > 0 && contentType !== "image/svg+xml") {
    const { default: sharp } = await import("sharp");
    body = await sharp(body).resize({ width: media.width, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    contentType = "image/webp";
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // SVG z úložiska sa nesmie správať ako dokument so skriptami.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
