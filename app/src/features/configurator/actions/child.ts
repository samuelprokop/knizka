"use server";

import { z } from "zod";

import { getMarket, isMarketCode } from "@/config/markets";
import { BOOK_LANGUAGES } from "@/i18n/locales";
import { lookupName, type NameLookup } from "../server/names";
import { createProject, sendProjectLink, updateChild, ValidationError, type ChildInput } from "../server/projects";
import { grantProjectSession } from "../server/session";
import { stepHref } from "../steps";
import { AGE_OPTIONS, emailSchema } from "../validation";
import { projectAction, publicAction, requestOrigin, userAgent, type ActionResult } from "./common";

const form = z.string().trim().min(1).max(24);
const formsSchema = z.object({ N: form, G: form, D: form, A: form, V: form, L: form, I: form });

const childSchema = z.object({
  name: z.string().max(40),
  gender: z.enum(["girl", "boy"]),
  age: z.number().int().refine((n) => (AGE_OPTIONS as readonly number[]).includes(n)),
  bookLanguage: z.enum(BOOK_LANGUAGES),
  occasion: z.string().max(30).nullable(),
  editedForms: formsSchema.nullable(),
  indeclinable: z.boolean(),
});

function parseChild(input: unknown): ChildInput {
  const parsed = childSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("child.name.invalid_chars");
  return parsed.data;
}

/** Živé ukážky viet a čipy domáckych podôb počas písania mena. */
export async function lookupNameAction(name: string, language: string, gender?: string): Promise<NameLookup | null> {
  if (typeof name !== "string" || !(BOOK_LANGUAGES as readonly string[]).includes(language)) return null;
  const g = gender === "boy" || gender === "girl" ? gender : undefined;
  return lookupName(name.slice(0, 40), language as (typeof BOOK_LANGUAGES)[number], g);
}

/**
 * Po kroku 1 a dialógu s e-mailom: založí projekt, pošle odkaz na návrat
 * a zariadeniu dá prístup (K1.5). Vracia adresu kroku 2.
 */
export async function createProjectAction(input: {
  market: string;
  child: unknown;
  email: string;
  marketingConsent: boolean;
}): Promise<ActionResult<{ href: string }>> {
  return publicAction(async () => {
    if (!isMarketCode(input.market)) throw new ValidationError("error.generic");
    const market = getMarket(input.market);
    const child = parseChild(input.child);
    if (!market.bookLanguages.includes(child.bookLanguage)) throw new ValidationError("error.generic");
    const email = emailSchema.safeParse(input.email.trim());
    if (!email.success) throw new ValidationError("configurator.email.invalid");

    const { project } = await createProject({
      market,
      child,
      email: email.data,
      marketingConsent: input.marketingConsent === true,
      userAgent: await userAgent(),
    });
    await grantProjectSession(project.id);
    await sendProjectLink(project.id, await requestOrigin());
    return { href: stepHref(market.code, project.id, 2) };
  });
}

export async function updateChildAction(projectId: string, child: unknown): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    await updateChild(id, parseChild(child));
  });
}

/** „Uložiť a pokračovať neskôr“ – nový odkaz na e-mail projektu. */
export async function sendLinkAction(projectId: string): Promise<ActionResult> {
  return projectAction(projectId, async (id) => {
    await sendProjectLink(id, await requestOrigin());
  });
}

/**
 * Zariadenie bez prístupu: pošle nový odkaz na e-mail projektu. Nevyžaduje
 * prístup, ale odkaz dostane len majiteľ e-mailu – nikto iný sa nič nedozvie.
 */
export async function resendLinkAction(projectId: string): Promise<ActionResult> {
  return publicAction(async () => {
    if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) return;
    await sendProjectLink(projectId, await requestOrigin());
  });
}
