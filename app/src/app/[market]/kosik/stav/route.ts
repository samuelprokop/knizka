import { and, desc, eq, inArray } from "drizzle-orm";

import { stepHref, type StepNumber } from "@/features/configurator/steps";

import { isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { sessionProjectIds } from "@/features/configurator/server/session";

/*
  Stav pre menu úvodnej stránky: kniha v košíku a rozpracovaná kniha na tomto
  zariadení (podľa cookie projektu). Úvodná stránka ostáva statická – klient si
  stav zistí až po načítaní.
*/
type Status = (typeof schema.projects.$inferSelect)["status"];
const IN_CART: Status[] = ["approved_by_customer"];
const IN_PROGRESS: Status[] = ["draft", "hero_approved", "text_approved", "generating", "preview"];

export async function GET(_request: Request, { params }: RouteContext<"/[market]/kosik/stav">) {
  const { market } = await params;
  if (!isMarketCode(market)) return new Response(null, { status: 404 });
  const ids = (await sessionProjectIds()).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const rows = ids.length
    ? await db
        .select({ id: schema.projects.id, status: schema.projects.status, currentStep: schema.projects.currentStep })
        .from(schema.projects)
        .where(and(inArray(schema.projects.id, ids), eq(schema.projects.market, market), inArray(schema.projects.status, [...IN_CART, ...IN_PROGRESS])))
        .orderBy(desc(schema.projects.lastActivityAt))
        .limit(10)
    : [];
  const cartCount = rows.filter((p) => IN_CART.includes(p.status)).length;
  const inCart = rows.find((p) => IN_CART.includes(p.status));
  const inProgress = rows.find((p) => IN_PROGRESS.includes(p.status));
  return Response.json(
    {
      cartCount,
      cartHref: cartCount > 1 ? `/${market}/kosik` : inCart ? `/${market}/kosik?projekt=${inCart.id}` : null,
      // Rozpracovaná kniha – menu ponúkne návrat presne na krok, kde zákazník skončil.
      continueHref: inProgress ? stepHref(market, inProgress.id, Math.min(Math.max(inProgress.currentStep, 1), 9) as StepNumber) : null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
