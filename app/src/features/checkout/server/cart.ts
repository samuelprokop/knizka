import "server-only";

import type { MarketCode } from "@/config/markets";
import type { PageCount, StoryPath, BookFormat } from "@/config/catalog";
import { loadBundle, nameContextOf } from "@/features/configurator/server/bundle";
import { lookOf } from "@/features/configurator/server/book";
import { loadBookVersion } from "@/features/book/server/versions";
import { signedMediaUrl } from "@/features/book/server/media";
import type { NameContext } from "@/lib/language";
import type { ProjectStatus } from "@/domain/project-status";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { sessionProjectIds } from "@/features/configurator/server/session";

/*
  Košík sa nikde neukladá (K10: „zákazník zmení knihu → položka v košíku sa
  aktualizuje“) – vždy sa počíta naživo z aktuálnej uzamknutej verzie knihy.
*/

export type CartView = {
  projectId: string;
  market: MarketCode;
  personalToken: string;
  email: string | null;
  status: ProjectStatus;
  bookVersionId: string;
  hero: NameContext;
  bookTitle: string;
  thumbnailUrl: string | null;
  storyPath: StoryPath;
  extraCharacters: number;
  pageCount: PageCount;
  format: BookFormat;
  coloringBook: boolean;
  /** Projekt už bol raz zaplatený – košík slúži na objednanie ďalšieho výtlačku (O6). */
  reorder: boolean;
};

const THUMBNAIL_WIDTH = 240;

/** Prístup overuje volajúci (hasProjectSession) – toto len načíta dáta, ak už sú v poriadku. */
export async function loadCart(projectId: string): Promise<CartView | null> {
  const bundle = await loadBundle(projectId);
  if (!bundle || !bundle.hero || !bundle.book?.lockedAt) return null;

  const { project } = bundle;
  // Prvá objednávka: projekt čaká schválený v košíku. Ďalší výtlačok (O6): projekt
  // už bol raz zaplatený – kým je "preview"/"generating" a pod., košík nie je prístupný.
  const REORDERABLE: ProjectStatus[] = ["paid", "in_review", "fixing", "awaiting_customer", "printing", "shipped", "delivered"];
  const reorder = REORDERABLE.includes(project.status);
  if (project.status !== "approved_by_customer" && !reorder) return null;

  const market = project.market as MarketCode;
  const book = await loadBookVersion(bundle.book.id);
  if (!book) return null;

  const coverImage = book.cover.hero ?? book.cover.scene ?? book.cover.portrait;
  const thumbnailUrl = coverImage ? signedMediaUrl(market, coverImage.key, { width: THUMBNAIL_WIDTH }) : null;

  return {
    projectId: project.id,
    market,
    personalToken: project.personalToken,
    email: project.email,
    status: project.status,
    bookVersionId: bundle.book.id,
    hero: nameContextOf(bundle.hero),
    bookTitle: book.meta.title,
    thumbnailUrl,
    storyPath: project.storyPath ?? "A",
    extraCharacters: bundle.companions.length,
    pageCount: (project.pageCount === 40 ? 40 : 32) as PageCount,
    format: (project.format === "A4" ? "A4" : "A5") as BookFormat,
    coloringBook: lookOf(bundle).coloringBook,
    reorder,
  };
}

/**
 * Knihy v košíku na tomto zariadení (schválené a nezaplatené, podľa cookie projektov),
 * od najnovšej. Pri viacerých knihách vedie ikona košíka na prehľad /kosik.
 */
export async function sessionCart(market: MarketCode): Promise<CartView[]> {
  const ids = (await sessionProjectIds()).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return [];
  const rows = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(inArray(schema.projects.id, ids), eq(schema.projects.market, market), eq(schema.projects.status, "approved_by_customer")))
    .orderBy(desc(schema.projects.lastActivityAt))
    .limit(20);
  const carts = await Promise.all(rows.map((r) => loadCart(r.id)));
  return carts.filter((c): c is CartView => !!c && !c.reorder);
}

/** Odkaz ikony košíka: jedna kniha = jej košík, viac kníh = prehľad. */
export const cartHrefFor = (market: MarketCode, items: { projectId: string }[]) =>
  items.length === 0 ? null : items.length === 1 ? `/${market}/kosik?projekt=${items[0].projectId}` : `/${market}/kosik`;
