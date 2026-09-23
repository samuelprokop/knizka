"use server";

import { z } from "zod";

import { READING_LEVELS } from "@/config/catalog";
import {
  approveText,
  chooseLibraryStory,
  editSpread,
  requestIdeas,
  rewriteSpread,
  saveStoryOptions,
  writeFromIdea,
  writeOwnStory,
} from "../server/story";
import { ValidationError } from "../server/projects";
import { DETAIL_SLOTS, WIZARD_MESSAGES, WIZARD_OCCASIONS, WIZARD_TONES, WIZARD_WORLDS } from "../model";
import { projectAction, type ActionResult } from "./common";

const detailsSchema = z.partialRecord(z.enum(DETAIL_SLOTS), z.string().max(60));

/** Cesta A („Vybrať“) alebo B (s detailmi) – príbeh z knižnice. */
export async function chooseStoryAction(projectId: string, storyId: string, details?: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = detailsSchema.safeParse(details ?? {});
    if (!parsed.success || typeof storyId !== "string") throw new ValidationError("error.generic");
    await chooseLibraryStory(id, storyId, parsed.data);
  });
}

const answersSchema = z.object({
  occasion: z.enum(WIZARD_OCCASIONS).optional(),
  worlds: z.array(z.enum(WIZARD_WORLDS)).max(2).optional(),
  message: z.enum(WIZARD_MESSAGES).optional(),
  favorites: z.string().max(200).optional(),
  companions: z.array(z.string().max(40)).max(5).optional(),
  tone: z.enum(WIZARD_TONES).optional(),
  wish: z.string().max(300).optional(),
});

export async function requestIdeasAction(projectId: string, answers: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = answersSchema.safeParse(answers);
    if (!parsed.success) throw new ValidationError("error.generic");
    await requestIdeas(id, parsed.data);
  });
}

export async function pickIdeaAction(projectId: string, index: number): Promise<ActionResult> {
  return projectAction(projectId, (id) => writeFromIdea(id, Number(index)));
}

export async function writeOwnStoryAction(projectId: string, text: string, mode: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => writeOwnStory(id, String(text), mode === "strict" ? "strict" : "free"));
}

export async function editSpreadAction(projectId: string, index: number, text: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => editSpread(id, Number(index), String(text)));
}

export async function rewriteSpreadAction(projectId: string, index: number, instruction: string): Promise<ActionResult> {
  return projectAction(projectId, (id) => rewriteSpread(id, Number(index), String(instruction)));
}

export async function approveTextAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, approveText);
}

const optionsSchema = z.object({
  readingLevel: z.enum(READING_LEVELS).optional(),
  spreadCount: z.union([z.literal(12), z.literal(16)]).optional(),
  bookTitle: z.string().max(80).optional(),
});

export async function saveStoryOptionsAction(projectId: string, input: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    const parsed = optionsSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("error.generic");
    await saveStoryOptions(id, parsed.data);
  });
}
