import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { grantProjectSession } from "@/features/configurator/server/session";

/*
  Vstup do košíka z osobnej stránky knihy (O6 „Ďalší výtlačok“) – token dokazuje
  prístup k projektu, tak ako jednorazový odkaz z e-mailu; rovnako mu tu udelíme
  cookie session, aby fungoval existujúci košík/pokladnica (vyžadujú ju, K10).
*/
export async function GET(request: NextRequest, ctx: RouteContext<"/[market]/moja-kniha/[token]/objednat">) {
  const { market, token } = await ctx.params;
  if (!isMarketCode(market)) return new NextResponse(null, { status: 404 });

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.personalToken, token) });
  if (!project || project.market !== market || project.status === "deleted") return new NextResponse(null, { status: 404 });

  await grantProjectSession(project.id);
  const target = new URL(`/${market}/kosik`, request.nextUrl.origin);
  target.searchParams.set("projekt", project.id);
  const response = NextResponse.redirect(target);
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
