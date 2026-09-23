import { NextResponse, type NextRequest } from "next/server";

import { redeemLink } from "@/features/configurator/server/projects";
import { grantProjectSession } from "@/features/configurator/server/session";
import { stepHref } from "@/features/configurator/steps";
import { isUiPreview } from "@/lib/ui-preview";

/*
  Návrat cez jednorazový odkaz z e-mailu: token sa overí a spotrebuje,
  zariadenie dostane prístup a zákazník sa ocitne presne na kroku, kde skončil.
  Funguje aj na inom zariadení – projekt sa obnovuje z DB, nie z prehliadača.
*/
export async function GET(request: NextRequest, ctx: RouteContext<"/[market]/kniha/pokracovat">) {
  const { market } = await ctx.params;
  const projectId = request.nextUrl.searchParams.get("p") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";

  // Náhľad UI: odkaz sa nespotrebuje, len otvorí projekt.
  if (isUiPreview()) return NextResponse.redirect(new URL(stepHref(market, projectId, 1), request.nextUrl.origin));

  const result = await redeemLink(projectId, token);
  const target = new URL(request.nextUrl);
  target.search = "";
  if (!result) {
    target.pathname = `/${market}/kniha/neplatny-odkaz`;
    if (/^[0-9a-f-]{36}$/i.test(projectId)) target.searchParams.set("p", projectId);
    return NextResponse.redirect(target);
  }

  await grantProjectSession(projectId);
  target.pathname = stepHref(result.market, projectId, result.step);
  const response = NextResponse.redirect(target);
  // Odkaz s tokenom sa nesmie dostať ďalej cez hlavičku Referer.
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
