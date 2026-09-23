import { NextResponse, type NextRequest } from "next/server";

/*
  Trh podľa domény / jazyka prehliadača. Lokálne a na vývojových doménach
  sú trhy v ceste (/sk, /cz). V produkcii (vlastné domény SK a CZ) sa tu
  doplní rewrite domény na /sk alebo /cz, aby verejné URL ostali bez prefixu.
*/

const MARKETS = ["sk", "cz"];

function detectMarket(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.endsWith(".cz")) return "cz";
  if (host.endsWith(".sk")) return "sk";
  const language = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return language.startsWith("cs") ? "cz" : "sk";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (MARKETS.includes(first)) return;

  request.nextUrl.pathname = `/${detectMarket(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Mimo API, administrácie, interných ciest Next.js a súborov s príponou (public/).
  matcher: ["/((?!api|admin|ui|_next|.*\\..*).*)"],
};
