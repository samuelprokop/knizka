import { and, desc, eq, inArray } from "drizzle-orm";

import { stepHref, type StepNumber } from "@/features/configurator/steps";

import { getMarket, isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { loadCart } from "@/features/checkout/server/cart";
import { nameContextOf } from "@/features/configurator/server/bundle";
import { sessionProjectIds } from "@/features/configurator/server/session";
import { createTranslator } from "@/i18n/format";

/*
  Stav pre menu úvodnej stránky: kniha v košíku a rozpracovaná kniha na tomto
  zariadení (podľa cookie projektu). Úvodná stránka ostáva statická – klient si
  stav zistí až po načítaní.

  `resume` = pripomienka pre vracajúceho sa zákazníka (ResumeNudge): kniha v košíku
  má prednosť pred rozpracovanou. Meno/názov ide len na zariadenie s cookie projektu.
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
  const continueHref = inProgress ? stepHref(market, inProgress.id, Math.min(Math.max(inProgress.currentStep, 1), 9) as StepNumber) : null;
  const cartHref = cartCount > 1 ? `/${market}/kosik` : inCart ? `/${market}/kosik?projekt=${inCart.id}` : null;

  let resume: { kind: "cart" | "progress"; text: string; href: string } | null = null;
  const t = createTranslator(getMarket(market).uiLanguage);
  if (inCart && cartHref) {
    const cart = await loadCart(inCart.id);
    if (cart) resume = { kind: "cart", text: cart.bookTitle, href: cartHref };
  } else if (inProgress && continueHref) {
    const hero = await db.query.characters.findFirst({
      where: and(eq(schema.characters.projectId, inProgress.id), eq(schema.characters.role, "hero")),
    });
    resume = { kind: "progress", text: hero ? t("landing.resume.progress.text", undefined, nameContextOf(hero)) : t("landing.resume.progress.text_anon"), href: continueHref };
  }

  return Response.json(
    {
      resume,
      cartCount,
      cartHref,
      // Rozpracovaná kniha – menu ponúkne návrat presne na krok, kde zákazník skončil.
      continueHref,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
