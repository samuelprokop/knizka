import "server-only";

import { desc, eq } from "drizzle-orm";

import { isMarketCode, type MarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { loadBookVersion } from "@/features/book/server/versions";
import { signedMediaUrl } from "@/features/book/server/media";
import { loadBundle, nameContextOf } from "@/features/configurator/server/bundle";
import type { NameContext } from "@/lib/language";

/*
  Osobná stránka knihy (QR v tiráži) – prístup len cez neuhádnuteľný `personalToken`,
  bez cookie session (funguje na ktoromkoľvek zariadení, K10 „Iné zariadenie“).
*/

export type PersonalPageView = {
  projectId: string;
  market: MarketCode;
  hero: NameContext;
  bookTitle: string;
  thumbnailUrl: string | null;
  /** Posledná zaplatená objednávka – ebook na stiahnutie, odkaz na stav. */
  latestOrderId: string | null;
};

const THUMBNAIL_WIDTH = 320;

export async function loadPersonalPage(token: string): Promise<PersonalPageView | null> {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.personalToken, token) });
  if (!project || project.status === "deleted" || !isMarketCode(project.market)) return null;

  const bundle = await loadBundle(project.id);
  if (!bundle?.hero || !bundle.book) return null;
  const book = await loadBookVersion(bundle.book.id);
  if (!book) return null;

  const [latestOrder] = await db
    .select({ id: schema.orders.id, status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.projectId, project.id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(1);

  const coverImage = book.cover.hero ?? book.cover.scene ?? book.cover.portrait;

  return {
    projectId: project.id,
    market: project.market,
    hero: nameContextOf(bundle.hero),
    bookTitle: book.meta.title,
    thumbnailUrl: coverImage ? signedMediaUrl(project.market, coverImage.key, { width: THUMBNAIL_WIDTH }) : null,
    latestOrderId: latestOrder && latestOrder.status !== "pending_payment" && latestOrder.status !== "cancelled" ? latestOrder.id : null,
  };
}
