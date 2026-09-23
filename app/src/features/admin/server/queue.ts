import "server-only";

import { isUiPreview } from "@/lib/ui-preview";

import { desc, eq, inArray } from "drizzle-orm";

import { assertTransition } from "@/domain/project-status";
import { db, schema } from "@/db";
import type { StyleId } from "@/config/catalog";
import { isMarketCode } from "@/config/markets";
import { signedMediaUrl } from "@/features/book/server/media";
import { currentCard, loadBundle, type Card } from "@/features/configurator/server/bundle";

const QUEUE_STATUSES = ["paid", "in_review", "fixing"] as const;

export type QueueItem = {
  projectId: string;
  market: string;
  status: string;
  heroName: string;
  createdAt: Date;
  flaggedPages: number;
  reportedPages: number;
  editedPages: number;
};

/** Knihy pred tlačou (I11): zaplatené, v kontrole alebo vrátené na opravu. */
export async function listReviewQueue(): Promise<QueueItem[]> {
  const projects = await db
    .select()
    .from(schema.projects)
    .where(inArray(schema.projects.status, [...QUEUE_STATUSES]))
    .orderBy(desc(schema.projects.updatedAt));

  const items: QueueItem[] = [];
  for (const project of projects) {
    const [hero] = await db
      .select({ name: schema.characters.name })
      .from(schema.characters)
      .where(eq(schema.characters.projectId, project.id))
      .limit(1);
    const [book] = await db
      .select({ id: schema.bookVersions.id })
      .from(schema.bookVersions)
      .where(eq(schema.bookVersions.projectId, project.id))
      .orderBy(desc(schema.bookVersions.version))
      .limit(1);
    let flagged = 0;
    let reported = 0;
    let edited = 0;
    if (book) {
      const pages = await db.select().from(schema.bookPages).where(eq(schema.bookPages.bookVersionId, book.id));
      for (const page of pages) {
        if (page.status === "needs_review") flagged++;
        if (page.editedByCustomer) edited++;
        const qa = page.qa as { reports?: string[] } | null;
        if (qa?.reports?.length) reported++;
      }
    }
    items.push({
      projectId: project.id,
      market: project.market,
      status: project.status,
      heroName: hero?.name ?? "?",
      createdAt: project.updatedAt,
      flaggedPages: flagged,
      reportedPages: reported,
      editedPages: edited,
    });
  }
  return items;
}

export type QueuePageView = {
  id: string;
  position: number;
  text: string | null;
  illustrationUrl: string | null;
  status: string;
  editedByCustomer: boolean;
  reports: string[];
};

export type QueueCardView = { characterId: string; name: string; role: string; portraitUrl: string | null };

export type QueueDetail = {
  projectId: string;
  status: string;
  heroName: string;
  pages: QueuePageView[];
  cards: QueueCardView[];
};

/**
 * Detail knihy pre grafika/redaktora. Otvorenie zo stavu "paid" spustí kontrolu
 * (prechod na "in_review") – rovnako ako pri prvom otvorení frontou v špecifikácii (I12).
 * Každé zobrazenie Karty (podoba hrdinu) sa zapisuje do auditu (S sekcia – zobrazenie fotky).
 */
export async function getQueueDetail(projectId: string, viewer: string): Promise<QueueDetail | null> {
  const bundle = await loadBundle(projectId);
  if (!bundle || !bundle.book) return null;
  if (!isMarketCode(bundle.project.market)) return null;

  if (bundle.project.status === "paid") {
    assertTransition("paid", "in_review");
    await db.update(schema.projects).set({ status: "in_review" }).where(eq(schema.projects.id, projectId));
    bundle.project.status = "in_review";
  }

  const market = bundle.project.market;
  const style = bundle.project.styleId as StyleId | null;
  const pages = bundle.pages
    .filter((p) => p.kind === "story_spread")
    .sort((a, b) => a.position - b.position)
    .map((page) => {
      const qa = page.qa as { reports?: string[] } | null;
      return {
        id: page.id,
        position: page.position,
        text: page.text,
        illustrationUrl: page.illustrationKey ? signedMediaUrl(market, page.illustrationKey, { width: 800 }) : null,
        status: page.status,
        editedByCustomer: page.editedByCustomer,
        reports: qa?.reports ?? [],
      };
    });

  const characters = [bundle.hero, ...bundle.companions, bundle.guide].filter((c): c is NonNullable<typeof c> => Boolean(c));
  const cards: QueueCardView[] = characters.map((character) => {
    const card = currentCard(bundle, character.id, style) as Card | null;
    const images = card?.images as Record<string, unknown> | null | undefined;
    const key = typeof images?.portrait === "string" ? images.portrait : null;
    return {
      characterId: character.id,
      name: character.name,
      role: character.role,
      portraitUrl: key ? signedMediaUrl(market, key, { width: 400 }) : null,
    };
  });

  if (!isUiPreview()) await db.insert(schema.auditLog).values({
    actor: viewer,
    action: "queue.view_cards",
    subjectType: "project",
    subjectId: projectId,
  });

  return { projectId, status: bundle.project.status, heroName: bundle.hero?.name ?? "?", pages, cards };
}

export async function approveBookAction(projectId: string, reviewer: string): Promise<void> {
  const bundle = await loadBundle(projectId);
  if (!bundle) throw new Error("Projekt neexistuje.");
  assertTransition(bundle.project.status, "printing");
  await db.transaction(async (tx) => {
    await tx.update(schema.projects).set({ status: "printing" }).where(eq(schema.projects.id, projectId));
    await tx.insert(schema.auditLog).values({ actor: reviewer, action: "queue.approve", subjectType: "project", subjectId: projectId });
  });
}

export async function returnBookAction(projectId: string, reviewer: string, note: string): Promise<void> {
  const bundle = await loadBundle(projectId);
  if (!bundle) throw new Error("Projekt neexistuje.");
  assertTransition(bundle.project.status, "fixing");
  await db.transaction(async (tx) => {
    await tx.update(schema.projects).set({ status: "fixing" }).where(eq(schema.projects.id, projectId));
    await tx.insert(schema.auditLog).values({ actor: reviewer, action: "queue.return", subjectType: "project", subjectId: projectId, reason: note });
  });
}
