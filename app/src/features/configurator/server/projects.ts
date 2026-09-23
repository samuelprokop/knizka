import "server-only";

import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { defaultsForAge } from "@/config/catalog";
import { getMarket, isMarketCode, type Market } from "@/config/markets";
import { db, schema } from "@/db";
import type { BookLanguage } from "@/i18n/locales";
import { CASE_KEYS, type Gender, type NameForms } from "@/lib/language";
import { resolveName } from "@/lib/language/resolve";
import { requestNameReview } from "@/lib/language/review";
import { recordConsents } from "./consents";
import { loadBundle, nameContextOf, type Project } from "./bundle";
import { generateLinkToken, hashToken, verifyLinkToken } from "./tokens";
import { getMailer } from "./mailer";
import { createTranslator } from "@/i18n/format";
import { changeRegeneratesBook, rewindStatus } from "../status";
import { stepHref, type StepNumber } from "../steps";
import type { ProjectOptions } from "../model";
import { capitalizeName, validateChildName } from "../validation";

// ---------------------------------------------------------------- krok 1

export type ChildInput = {
  /** Podoba mena, pod ktorou dieťa v knihe vystupuje (Janko, nie Ján). */
  name: string;
  gender: Gender;
  age: number;
  bookLanguage: BookLanguage;
  occasion: string | null;
  /** Tvary, ktoré zákazník prepísal vo vzorových vetách (inak zo slovníka/pravidiel). */
  editedForms: NameForms | null;
  indeclinable: boolean;
};

export class ValidationError extends Error {
  constructor(public readonly key: string) {
    super(key);
  }
}

/** Tvary mena pre knihu + či ide projekt na jazykovú kontrolu (K1.3, J4). */
export async function resolveChildName(input: ChildInput) {
  const error = validateChildName(input.name);
  if (error) throw new ValidationError(error);
  const name = capitalizeName(input.name);
  const resolved = await resolveName(name, input.bookLanguage, input.gender);
  const forms = input.editedForms ?? resolved.forms;
  const edited = !!input.editedForms && Object.entries(input.editedForms).some(
    ([key, value]) => resolved.forms[key as keyof NameForms] !== value
  );
  return {
    name: resolved.source === "dictionary" ? resolved.name : name,
    forms,
    /** Návrh pred úpravou zákazníkom – ide do úlohy jazykovej kontroly ako `proposedForms`. */
    proposedForms: resolved.forms,
    indeclinable: input.indeclinable || !resolved.declinable,
    needsLanguageReview: resolved.source === "rules" || !resolved.verified || edited || input.indeclinable,
  };
}

export async function createProject(input: {
  market: Market;
  child: ChildInput;
  email: string;
  marketingConsent: boolean;
  userAgent: string | null;
}): Promise<{ project: Project; linkToken: string }> {
  const name = await resolveChildName(input.child);
  const linkToken = generateLinkToken();

  const created = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(schema.projects)
      .values({
        market: input.market.code,
        bookLanguage: input.child.bookLanguage,
        email: input.email.toLowerCase(),
        accessTokenHash: hashToken(linkToken),
        currentStep: 2,
        occasion: input.child.occasion,
        layoutId: defaultsForAge(input.child.age).layout,
        needsLanguageReview: name.needsLanguageReview,
        options: { readingLevel: defaultsForAge(input.child.age).readingLevel } satisfies ProjectOptions,
      })
      .returning();
    const [hero] = await tx
      .insert(schema.characters)
      .values({
        projectId: project.id,
        role: "hero",
        name: name.name,
        nameForms: name.forms,
        nameIndeclinable: name.indeclinable,
        gender: input.child.gender,
        age: input.child.age,
      })
      .returning();
    return { project, hero };
  });

  if (name.needsLanguageReview) {
    await requestNameReview({
      projectId: created.project.id,
      characterId: created.hero.id,
      language: input.child.bookLanguage,
      name: name.name,
      gender: input.child.gender,
      proposedForms: name.proposedForms,
      customerForms: input.child.editedForms ?? undefined,
      declinable: !name.indeclinable,
    });
  }

  await recordConsents(
    created.project.id,
    [{ type: "marketing", granted: input.marketingConsent, textKey: "common.email_dialog.marketing" }],
    { language: input.market.uiLanguage, userAgent: input.userAgent }
  );
  return { project: created.project, linkToken };
}

/** Úprava kroku 1 v existujúcom projekte. Zmena mena po vygenerovaní vráti knihu pred generovanie. */
export async function updateChild(projectId: string, child: ChildInput) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) throw new Error("Projekt nemá hrdinu");
  const name = await resolveChildName(child);
  const hero = bundle.hero;

  const textChanged =
    hero.name !== name.name ||
    // Po pádoch – jsonb nezachováva poradie kľúčov, JSON.stringify by hlásil zmenu vždy.
    CASE_KEYS.some((key) => (hero.nameForms as NameForms | null)?.[key] !== name.forms[key]) ||
    hero.gender !== child.gender ||
    hero.nameIndeclinable !== name.indeclinable ||
    bundle.project.bookLanguage !== child.bookLanguage;

  const status = textChanged && changeRegeneratesBook(bundle.project.status)
    ? rewindStatus(bundle.project.status, "text_approved")
    : bundle.project.status;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.characters)
      .set({
        name: name.name,
        nameForms: name.forms,
        nameIndeclinable: name.indeclinable,
        gender: child.gender,
        age: child.age,
      })
      .where(eq(schema.characters.id, hero.id));
    await tx
      .update(schema.projects)
      .set({
        bookLanguage: child.bookLanguage,
        occasion: child.occasion,
        status,
        needsLanguageReview: bundle.project.needsLanguageReview || name.needsLanguageReview,
        lastActivityAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId));
  });

  if (name.needsLanguageReview) {
    await requestNameReview({
      projectId,
      characterId: hero.id,
      language: child.bookLanguage,
      name: name.name,
      gender: child.gender,
      proposedForms: name.proposedForms,
      customerForms: child.editedForms ?? undefined,
      declinable: !name.indeclinable,
    });
  }
}

// ---------------------------------------------------------------- návrat cez odkaz

/** Nový jednorazový odkaz – predchádzajúci tým prestane platiť. */
export async function issueLink(projectId: string): Promise<string> {
  const token = generateLinkToken();
  await db.update(schema.projects).set({ accessTokenHash: hashToken(token) }).where(eq(schema.projects.id, projectId));
  return token;
}

export const linkUrl = (origin: string, market: string, projectId: string, token: string) =>
  `${origin}/${market}/kniha/pokracovat?p=${encodeURIComponent(projectId)}&t=${encodeURIComponent(token)}`;

/** Pošle odkaz na návrat na e-mail projektu. */
export async function sendProjectLink(projectId: string, origin: string, kind: "link" | "preview_ready" = "link") {
  const bundle = await loadBundle(projectId);
  if (!bundle?.project.email || !bundle.hero) return;
  const token = await issueLink(projectId);
  const market = isMarketCode(bundle.project.market) ? getMarket(bundle.project.market) : null;
  if (!market) return;
  const t = createTranslator(market.uiLanguage);
  await getMailer().send({
    to: bundle.project.email,
    kind,
    subject: t(kind === "link" ? "email.subject.link" : "email.subject.preview_ready", undefined, nameContextOf(bundle.hero)),
    url: linkUrl(origin, bundle.project.market, projectId, token),
  });
}

/**
 * Overí jednorazový token z odkazu a hneď ho spotrebuje (vymení za nový,
 * ktorý nikto nepozná). Vracia krok, na ktorom zákazník skončil.
 */
export async function redeemLink(projectId: string, token: string): Promise<{ market: string; step: StepNumber } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || token.length > 200) return null;
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!project || project.status === "deleted" || !verifyLinkToken(token, project.accessTokenHash)) return null;

  // Podmienka na starý hash: dva súčasné pokusy s tým istým odkazom neprejdú oba.
  const rotated = await db
    .update(schema.projects)
    .set({ accessTokenHash: hashToken(generateLinkToken()), lastActivityAt: new Date() })
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.accessTokenHash, project.accessTokenHash!)))
    .returning({ id: schema.projects.id });
  if (rotated.length === 0) return null;
  return { market: project.market, step: Math.min(Math.max(project.currentStep, 1), 9) as StepNumber };
}

/** Zapamätá krok, na ktorom zákazník je – odkaz z e-mailu otvorí presne ten. */
export async function touchStep(projectId: string, step: StepNumber) {
  await db
    .update(schema.projects)
    .set({ currentStep: step, lastActivityAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

export const stepUrl = (project: Pick<Project, "market" | "id">, n: StepNumber) => stepHref(project.market, project.id, n);

// ---------------------------------------------------------------- limity bez nákupu

/** Počet projektov na e-mail za 30 dní, ktoré prešli daným stavom (K9.2, K5.12). */
export async function countRecentProjects(email: string, filter: "custom_story" | "preview") {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const conditions = [eq(schema.projects.email, email.toLowerCase()), gte(schema.projects.createdAt, since)];
  if (filter === "custom_story") conditions.push(inArray(schema.projects.storyPath, ["C", "D"]));
  else conditions.push(inArray(schema.projects.status, ["preview", "approved_by_customer"]));
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.projects)
    .where(and(...conditions));
  return row?.n ?? 0;
}
