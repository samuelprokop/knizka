import "server-only";

import type { MarketCode } from "@/config/markets";
import type { PageCount, StoryPath, BookFormat } from "@/config/catalog";
import { loadBundle, nameContextOf } from "@/features/configurator/server/bundle";
import { lookOf } from "@/features/configurator/server/book";
import { loadBookVersion } from "@/features/book/server/versions";
import { signedMediaUrl } from "@/features/book/server/media";
import type { NameContext } from "@/lib/language";
import type { ProjectStatus } from "@/domain/project-status";

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
