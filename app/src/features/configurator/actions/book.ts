"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

import { ACTIVITIES, BOOK_FORMATS, COVER_DESIGNS, LAYOUTS } from "@/config/catalog";
import { db, schema } from "@/db";
import {
  approveBook,
  editPageImage,
  editPageText,
  finishPageImage,
  reportPage,
  rewritePageText,
  runGeneration,
  saveLook,
  savePersonalTexts,
  startGeneration,
  undoPage,
} from "../server/book";
import { loadBundle } from "../server/bundle";
import { sendProjectLink, ValidationError } from "../server/projects";
import { ENDPAPERS, FONT_PAIRS, THEMES, TITLE_POSITIONS } from "../model";
import { advanceStatus } from "../status";
import { projectAction, requestOrigin, type ActionResult } from "./common";

const lookSchema = z.object({
  cover: z.enum(COVER_DESIGNS).optional(),
  theme: z.enum(THEMES).optional(),
  font: z.enum(FONT_PAIRS).optional(),
  titlePosition: z.enum(TITLE_POSITIONS).optional(),
  endpapers: z.enum(ENDPAPERS).optional(),
  frames: z.boolean().optional(),
  backPortrait: z.boolean().optional(),
  activities: z.array(z.enum(ACTIVITIES)).max(7).optional(),
  parentGuide: z.boolean().optional(),
  parentLetter: z.boolean().optional(),
  coloringBook: z.boolean().optional(),
  layout: z.enum(LAYOUTS).optional(),
  format: z.enum(BOOK_FORMATS).optional(),
  pageCount: z.union([z.literal(32), z.literal(40)]).optional(),
});

/** Každá voľba v kroku 6 sa uloží hneď – ukážka aj cena sa prekreslia. */
export async function saveLookAction(projectId: string, input: unknown): Promise<ActionResult<{ regenerate: boolean }>> {
  return projectAction(projectId, async (id) => {
    const parsed = lookSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("activities.help");
    const result = await saveLook(id, parsed.data);
    if (result.regenerate) after(() => runGeneration(id));
    return result;
  });
}

/** „Vygenerovať knihu“ – voľby sa uzamknú do verzie, generovanie beží na pozadí (krok 7). */
export async function generateBookAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    await startGeneration(id);
    after(() => runGeneration(id));
  });
}

/** „Pošlite mi odkaz, keď bude hotová“. */
export async function notifyWhenReadyAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const origin = await requestOrigin();
    after(async () => {
      // Počká na dokončenie generovania (mock je rýchly; reálne pošle e-mail worker z balíka B).
      for (let i = 0; i < 120; i++) {
        const bundle = await loadBundle(id);
        if (!bundle || bundle.project.status !== "generating") break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      await sendProjectLink(id, origin, "preview_ready");
    });
  });
}

export async function editPageTextAction(projectId: string, pageId: string, text: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => editPageText(id, String(pageId), String(text)));
}

export async function rewritePageAction(projectId: string, pageId: string, instruction: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => rewritePageText(id, String(pageId), String(instruction)));
}

export async function editPageImageAction(projectId: string, pageId: string, instruction: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const { bundle, page, instruction: clean } = await editPageImage(id, String(pageId), String(instruction));
    after(() => finishPageImage(bundle, page, clean));
  });
}

export async function undoPageAction(projectId: string, pageId: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => undoPage(id, String(pageId)));
}

export async function reportPageAction(projectId: string, pageId: string, reason: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => reportPage(id, String(pageId), String(reason)));
}

const textsSchema = z.object({
  dedication: z.string().max(400).optional(),
  from: z.string().max(100).optional(),
  date: z.string().max(80).optional(),
  letter: z.string().max(1000).optional(),
  back: z.string().max(500).optional(),
});

export async function savePersonalTextsAction(projectId: string, input: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = textsSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("error.generic");
    await savePersonalTexts(id, parsed.data);
  });
}

/** Potvrdenie 3 viet a „Schváliť a objednať“ (K9.1). */
export async function approveBookAction(projectId: string, checks: boolean[]): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    if (!Array.isArray(checks) || checks.length !== 3 || !checks.every((c) => c === true)) {
      throw new ValidationError("approve.title");
    }
    await approveBook(id);
  });
}

/** „Ešte niečo upraviť“ po schválení – pred platbou sa dá vrátiť k úpravám bez obmedzenia. */
export async function reopenBookAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, reopenBook);
}

/**
 * Odstránenie knihy z košíka: kniha sa vráti do náhľadu (nič sa nemaže – ostáva uložená,
 * dá sa k nej vrátiť cez menu úvodnej stránky alebo odkaz v e-maile).
 */
export async function removeFromCartAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, reopenBook);
}

async function reopenBook(id: string) {
  const bundle = await loadBundle(id);
  if (!bundle?.book || bundle.project.status !== "approved_by_customer") return;
  await db.update(schema.bookVersions).set({ lockedAt: null }).where(eq(schema.bookVersions.id, bundle.book.id));
  await db
    .update(schema.projects)
    .set({ status: advanceStatus("approved_by_customer", "preview") })
    .where(eq(schema.projects.id, id));
}
