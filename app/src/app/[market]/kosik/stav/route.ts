import { and, desc, eq, inArray } from "drizzle-orm";

import { isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { sessionProjectIds } from "@/features/configurator/server/session";

/*
  Stav košíka pre hlavičku úvodnej stránky: kniha schválená a čakajúca v košíku
  na tomto zariadení (podľa cookie projektu). Úvodná stránka ostáva statická –
  košík si zistí klient až po načítaní. Bez knihy v košíku sa ikona nezobrazí.
*/
export async function GET(_request: Request, { params }: RouteContext<"/[market]/kosik/stav">) {
  const { market } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const ids = (await sessionProjectIds()).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const [project] = ids.length
    ? await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(and(inArray(schema.projects.id, ids), eq(schema.projects.market, market), eq(schema.projects.status, "approved_by_customer")))
        .orderBy(desc(schema.projects.lastActivityAt))
        .limit(1)
    : [];
  return Response.json(
    { href: project ? `/${market}/kosik?projekt=${project.id}` : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
