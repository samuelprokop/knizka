import "server-only";

import { desc, eq } from "drizzle-orm";

import { isMarketCode, type MarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { worksheetPages } from "@/features/book/model/pages";
import type { Book } from "@/features/book/model/types";
import { loadBookVersion } from "@/features/book/server/versions";
import { withSignedImages } from "@/features/book/server/media";
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
  /** Kniha bez podpísaných obrázkov – vstup pre PDF (pracovné listy). */
  book: Book;
  /** Kniha s podpísanými URL obrázkov – listovanie na stránke. */
  signedBook: Book;
  /** Počet strán aktivít – pracovné listy na vytlačenie. */
  worksheetCount: number;
  /** Posledná zaplatená objednávka – ebook na stiahnutie, odkaz na stav. */
  latestOrderId: string | null;
};

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

  return {
    projectId: project.id,
    market: project.market,
    hero: nameContextOf(bundle.hero),
    bookTitle: book.meta.title,
    book,
    signedBook: withSignedImages(book, project.market),
    worksheetCount: worksheetPages(book).length,
    latestOrderId: latestOrder && latestOrder.status !== "pending_payment" && latestOrder.status !== "cancelled" ? latestOrder.id : null,
  };
}
