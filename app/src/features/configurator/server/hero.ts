import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { LIMITS, STYLES, type StyleId } from "@/config/catalog";
import { db, schema } from "@/db";
import type { CharacterPortraitRequest } from "@/server/ai";
import { enqueue } from "@/server/jobs/queue";
import { runJobInline } from "@/server/jobs";
import { storage } from "@/server/storage";
import {
  appearanceOf,
  currentCard,
  loadBundle,
  photosOf,
  usablePhotos,
  type Character,
  type ProjectBundle,
} from "./bundle";
import { getPhotoChecker, type PhotoVerdict } from "./photo-check";
import { advanceStatus, rewindStatus } from "../status";
import type { Appearance, ProjectOptions } from "../model";

const DAY = 24 * 60 * 60 * 1000;
/** Fotka žije najviac 7 dní; po schválení Karty najviac 24 hodín (S5, F). */
const PHOTO_MAX_AGE = 7 * DAY;
const PHOTO_AFTER_APPROVAL = DAY;

export const ACCEPTED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
};
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

// ---------------------------------------------------------------- fotky

export async function addPhoto(input: {
  projectId: string;
  characterId: string;
  data: Buffer;
  contentType: string;
  width?: number;
  height?: number;
}): Promise<{ photoId: string | null; verdict: PhotoVerdict }> {
  const ext = ACCEPTED_PHOTO_TYPES[input.contentType];
  if (!ext) throw new Error("Nepodporovaný typ fotky");

  const existing = await db
    .select({ id: schema.photos.id })
    .from(schema.photos)
    .where(and(eq(schema.photos.characterId, input.characterId), isNull(schema.photos.deletedAt)));
  if (existing.length >= LIMITS.photosPerCharacter) throw new Error("Najviac 3 fotky");

  const verdict = await getPhotoChecker().check(input);
  if (verdict.verdict === "rejected") {
    // Nevhodný obsah sa nespracuje ani neuloží; projekt ide na ručné preverenie (K2.5).
    await db.insert(schema.auditLog).values({
      actor: "system",
      action: "photo_rejected",
      subjectType: "project",
      subjectId: input.projectId,
    });
    return { photoId: null, verdict };
  }
  if (verdict.verdict === "bad") return { photoId: null, verdict };

  const storageKey = `photos/${input.projectId}/${crypto.randomUUID()}.${ext}`;
  await storage.put(storageKey, input.data, input.contentType);
  const [photo] = await db
    .insert(schema.photos)
    .values({
      characterId: input.characterId,
      storageKey,
      verdict: verdict.verdict,
      verdictReason: verdict.verdict === "ok" ? verdict.advice : null,
      deleteAfter: new Date(Date.now() + PHOTO_MAX_AGE),
    })
    .returning({ id: schema.photos.id });

  await db
    .update(schema.characters)
    .set({ appearanceSource: "photo" })
    .where(eq(schema.characters.id, input.characterId));
  return { photoId: photo.id, verdict };
}

/** Okamžité zmazanie súboru aj odkazu (zákazník fotku odobral). */
export async function removePhoto(characterIds: string[], photoId: string) {
  const [photo] = await db
    .select()
    .from(schema.photos)
    .where(and(eq(schema.photos.id, photoId), inArray(schema.photos.characterId, characterIds)))
    .limit(1);
  if (!photo) return;
  if (photo.storageKey) await storage.delete(photo.storageKey);
  await db
    .update(schema.photos)
    .set({ storageKey: null, deletedAt: new Date() })
    .where(eq(schema.photos.id, photo.id));
}

export async function saveDescription(characterId: string, appearance: Appearance) {
  await db
    .update(schema.characters)
    .set({ appearanceSource: "description", appearance })
    .where(eq(schema.characters.id, characterId));
}

// ---------------------------------------------------------------- portréty a Karta

function portraitRequest(bundle: ProjectBundle, character: Character, style: StyleId): CharacterPortraitRequest {
  const photos = character.appearanceSource === "photo" ? usablePhotos(photosOf(bundle, character.id)) : [];
  return {
    photoKeys: photos.map((p) => p.storageKey).filter((k): k is string => !!k),
    appearance: appearanceOf(character),
    age: character.age ?? undefined,
    style,
  };
}

/**
 * Portrét hrdinu vo všetkých štýloch (K3.1). Beží na pozadí po kroku 2;
 * krok 3 ukazuje hotové portréty postupne. Predchádzajúce portréty sa nahradia.
 */
export async function generateStylePortraits(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) return;
  const hero = bundle.hero;

  await db
    .delete(schema.characterCards)
    .where(and(eq(schema.characterCards.characterId, hero.id), eq(schema.characterCards.version, 0)));
  const rows = await db
    .insert(schema.characterCards)
    .values(STYLES.map((styleId) => ({ characterId: hero.id, styleId, version: 0, status: "generating" as const })))
    .returning();

  await Promise.all(
    rows.map((row) =>
      enqueue({
        type: "style_portrait",
        projectId,
        payload: { cardId: row.id, request: portraitRequest(bundle, hero, row.styleId as StyleId) },
        relatedType: "character_card",
        relatedId: row.id,
        maxAttempts: 3,
      })
    )
  );
}

/** Odtlačok vstupu portrétov – fotky alebo opis. Pri zhode netreba kresliť znova. */
function portraitInputKey(bundle: ProjectBundle, hero: Character) {
  const photoIds = usablePhotos(photosOf(bundle, hero.id)).map((p) => p.id).sort();
  return JSON.stringify({ source: hero.appearanceSource, photos: hero.appearanceSource === "photo" ? photoIds : [], appearance: hero.appearance });
}

/**
 * Po kroku 2: ak sa fotky alebo opis zmenili, nakreslia sa nové portréty.
 * Zmena podoby po schválení Karty vráti projekt pred schválenie.
 * Vracia true, ak treba spustiť kreslenie na pozadí.
 */
export async function finishAppearance(projectId: string, source: "photo" | "description") {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) throw new Error("Projekt nemá hrdinu");
  const hero = { ...bundle.hero, appearanceSource: source };
  const key = portraitInputKey(bundle, hero);
  const unchanged = bundle.options.portraitsFor === key && stylePortraitsOf(bundle).length > 0;

  const status = !unchanged && bundle.project.status !== "draft" ? rewindStatus(bundle.project.status, "draft") : bundle.project.status;
  await db.update(schema.characters).set({ appearanceSource: source }).where(eq(schema.characters.id, hero.id));
  await db
    .update(schema.projects)
    .set({ status, currentStep: 3, options: { ...bundle.options, portraitsFor: key } satisfies ProjectOptions })
    .where(eq(schema.projects.id, projectId));
  return !unchanged;
}

const stylePortraitsOf = (bundle: ProjectBundle) =>
  bundle.hero ? bundle.cards.filter((c) => c.characterId === bundle.hero!.id && c.version === 0) : [];

/** Nová verzia Karty postavy vo zvolenom štýle (K3.2) – aj pri pregenerovaní a úprave vzhľadu. */
export async function generateCard(input: {
  projectId: string;
  characterId: string;
  style: StyleId;
  reason?: string | null;
  feedback?: { reasons: string[]; note?: string };
}) {
  const bundle = await loadBundle(input.projectId);
  const character = [bundle?.hero, ...(bundle?.companions ?? []), bundle?.guide].find((c) => c?.id === input.characterId);
  if (!bundle || !character) throw new Error("Postava nepatrí k projektu");

  const latest = bundle.cards.find((c) => c.characterId === character.id && c.version >= 1);
  const [card] = await db
    .insert(schema.characterCards)
    .values({
      characterId: character.id,
      styleId: input.style,
      version: (latest?.version ?? 0) + 1,
      status: "generating",
      regenerationReason: input.reason ?? null,
    })
    .returning();

  const jobId = await enqueue({
    type: "character_card",
    projectId: input.projectId,
    payload: { cardId: card.id, request: { ...portraitRequest(bundle, character, input.style), ...(input.feedback ? { feedback: input.feedback } : {}) } },
    relatedType: "character_card",
    relatedId: card.id,
    maxAttempts: 3,
  });
  // Karta sa čaká synchrónne (UI ju hneď potom zobrazuje) – úloha vo fronte ostáva
  // trvalým záznamom pre prípad pádu procesu (N5), worker ju doberie.
  await runJobInline(jobId);
  return card.id;
}

/** Počet pregenerovaní s dôvodom v aktuálnom štýle (3 v cene, K3.3). */
export function regenerationsUsed(bundle: ProjectBundle, characterId: string, style: string | null) {
  return bundle.cards.filter(
    (c) => c.characterId === characterId && c.version >= 1 && c.styleId === style && !!c.regenerationReason && c.regenerationReason !== "appearance"
  ).length;
}

export const regenerationsLeft = (bundle: ProjectBundle, characterId: string, style: string | null) =>
  Math.max(0, LIMITS.heroCardRegenerations - regenerationsUsed(bundle, characterId, style));

/**
 * Výber štýlu (krok 3, obrazovka A). Zmena štýlu po schválení Karty vráti
 * projekt pred schválenie – Kartu treba schváliť znova v novom štýle.
 */
export async function chooseStyle(projectId: string, style: StyleId) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero) throw new Error("Projekt nemá hrdinu");
  const changed = bundle.project.styleId !== style;
  const status = changed && bundle.project.status !== "draft" ? rewindStatus(bundle.project.status, "draft") : bundle.project.status;

  await db.update(schema.projects).set({ styleId: style, status }).where(eq(schema.projects.id, projectId));
  if (!currentCard(bundle, bundle.hero.id, style) || changed) {
    await generateCard({ projectId, characterId: bundle.hero.id, style });
  }
}

/** Schválenie Karty hrdinu (K3.4): čas a verzia; fotky sa odteraz nepoužívajú a zmažú sa do 24 h. */
export async function approveHeroCard(projectId: string) {
  const bundle = await loadBundle(projectId);
  if (!bundle?.hero || !bundle.project.styleId) throw new Error("Chýba štýl alebo hrdina");
  const card = currentCard(bundle, bundle.hero.id, bundle.project.styleId);
  if (!card || card.status !== "ready" && card.status !== "approved") throw new Error("Karta nie je hotová");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.characterCards)
      .set({ status: "approved", approvedAt: now })
      .where(eq(schema.characterCards.id, card.id));
    if (bundle.project.status === "draft") {
      let status = advanceStatus("draft", "hero_approved");
      // Príbeh zvolený pred zmenou štýlu/podoby ostáva – netreba ho vyberať znova.
      if (storyStillChosen(bundle)) status = advanceStatus(status, "text_approved");
      await tx.update(schema.projects).set({ status }).where(eq(schema.projects.id, projectId));
    }
    // Lehotu zmazania len skrátime, nikdy nepredĺžime.
    const deadline = new Date(now.getTime() + PHOTO_AFTER_APPROVAL);
    await tx
      .update(schema.photos)
      .set({ deleteAfter: sql`least(${schema.photos.deleteAfter}, ${deadline.toISOString()}::timestamptz)` })
      .where(and(eq(schema.photos.characterId, bundle.hero!.id), isNull(schema.photos.deletedAt)));
  });
}

/** Úprava vzhľadu z panela „Upraviť podobu“ – prepíše Kartu, nepočíta sa do pokusov. */
export async function updateAppearance(projectId: string, characterId: string, patch: Appearance) {
  const bundle = await loadBundle(projectId);
  const character = [bundle?.hero, ...(bundle?.companions ?? [])].find((c) => c?.id === characterId);
  if (!bundle || !character || !bundle.project.styleId) throw new Error("Postava nepatrí k projektu");
  // Nová podoba hrdinu = Kartu treba schváliť znova (príbeh a voľby ostávajú).
  if (character.role === "hero" && bundle.project.status !== "draft") {
    const status = rewindStatus(bundle.project.status, "draft");
    await db.update(schema.projects).set({ status }).where(eq(schema.projects.id, projectId));
  }
  await db
    .update(schema.characters)
    .set({ appearance: { ...appearanceOf(character), ...patch } })
    .where(eq(schema.characters.id, characterId));
  await generateCard({ projectId, characterId, style: bundle.project.styleId as StyleId, reason: "appearance" });
}

/** Príbeh je vybraný (A/B) alebo text schválený (C/D) – po novom schválení Karty sa pokračuje ďalej. */
export function storyStillChosen(bundle: ProjectBundle) {
  const path = bundle.project.storyPath;
  if (path === "A" || path === "B") return !!bundle.project.storyId;
  if (path === "C" || path === "D") return !!bundle.storyInput.textApprovedAt;
  return false;
}
