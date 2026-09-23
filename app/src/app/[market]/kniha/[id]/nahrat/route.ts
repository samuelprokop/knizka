import { NextResponse, type NextRequest } from "next/server";

import { loadBundle } from "@/features/configurator/server/bundle";
import { ACCEPTED_PHOTO_TYPES, addPhoto, MAX_PHOTO_BYTES } from "@/features/configurator/server/hero";
import { hasProjectSession } from "@/features/configurator/server/session";

/*
  Nahratie fotky postavy (krok 2 a 4). Cez route handler, nie server action –
  fotka z mobilu (HEIC) býva väčšia ako limit akcie 1 MB.
  Fotka ide len do oddeleného úložiska pod photos/, nikdy do DB ani logov.
*/
export async function POST(request: NextRequest, ctx: RouteContext<"/[market]/kniha/[id]/nahrat">) {
  const { id } = await ctx.params;
  if (!(await hasProjectSession(id))) return NextResponse.json({ ok: false, error: "error.session_expired" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const characterId = String(form?.get("characterId") ?? "");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "error.upload_failed" }, { status: 400 });

  // Niektoré prehliadače HEIC neoznačia typom – rozhodne prípona.
  const type = file.type || (/\.hei[cf]$/i.test(file.name) ? "image/heic" : "");
  if (!ACCEPTED_PHOTO_TYPES[type] || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ ok: false, error: "error.upload_failed" }, { status: 400 });
  }

  const bundle = await loadBundle(id);
  const character = [bundle?.hero, ...(bundle?.companions ?? [])].find((c) => c?.id === characterId);
  if (!bundle || !character) return NextResponse.json({ ok: false, error: "error.generic" }, { status: 400 });

  const size = (key: string) => {
    const n = Number(form?.get(key));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };

  try {
    const result = await addPhoto({
      projectId: id,
      characterId: character.id,
      data: Buffer.from(await file.arrayBuffer()),
      contentType: type,
      width: size("width"),
      height: size("height"),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "error.upload_failed" }, { status: 400 });
  }
}
