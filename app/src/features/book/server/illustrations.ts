import "server-only";

import type { StyleId } from "@/config/catalog";
import { getImageProvider, withAiJob, type CharacterPortraitRequest, type SceneRequest } from "@/server/ai";
import { storage } from "@/server/storage";
import type { BookImage } from "../model/types";

/*
  Ilustrácie pre renderer. Skutočný pipeline scén (vkladanie hrdinu, kontrola,
  pregenerovanie) je balík B – tu sú len volania adaptéra, ktoré renderer potrebuje
  pre náhľad a vývoj, každé zalogované do ai_jobs (I2) cez server/ai::withAiJob.
*/

/** Ilustrácia scény cez ImageProvider (bez fotiek – len kľúče Kariet). */
export async function generateScene(projectId: string | null, req: SceneRequest): Promise<BookImage> {
  const { image } = await withAiJob(
    { projectId, kind: "scene", params: { style: req.style, aspect: req.aspect }, prompt: req.scene },
    () => getImageProvider().scene(req)
  );
  return { key: image.storageKey };
}

// ---------------------------------------------------------------- demo sada (vývoj, ukážka v kroku 6)

export type DemoIllustrations = {
  square: BookImage[];
  wide: BookImage[];
  heroFullBody: BookImage;
  heroPortrait: BookImage;
};

const DEMO_COUNT = 16;
const manifestKey = (style: StyleId) => `mock/demo/${style}.json`;

/**
 * Ukážkové ilustrácie štýlu z mock adaptéra. Vytvoria sa raz (a zalogujú),
 * potom sa používajú z manifestu v úložisku – náhľad tak negeneruje pri každom zobrazení.
 */
export function getDemoIllustrations(style: StyleId): Promise<DemoIllustrations> {
  // Súbežné prvé požiadavky čakajú na to isté vytvorenie.
  const g = globalThis as unknown as { demoIllustrations?: Map<StyleId, Promise<DemoIllustrations>> };
  g.demoIllustrations ??= new Map();
  let pending = g.demoIllustrations.get(style);
  if (!pending) {
    pending = loadOrCreateDemo(style);
    pending.catch(() => g.demoIllustrations?.delete(style));
    g.demoIllustrations.set(style, pending);
  }
  return pending;
}

async function loadOrCreateDemo(style: StyleId): Promise<DemoIllustrations> {
  try {
    return JSON.parse((await storage.get(manifestKey(style))).toString("utf8")) as DemoIllustrations;
  } catch {
    // Manifest ešte neexistuje – vytvoríme ho.
  }

  const scene = (index: number, aspect: "1:1" | "2:1") =>
    generateScene(null, { style, aspect, scene: `Ukážková scéna ${index + 1}`, characterCardKeys: [] });
  const square = await Promise.all(Array.from({ length: DEMO_COUNT }, (_, i) => scene(i, "1:1")));
  const wide = await Promise.all(Array.from({ length: DEMO_COUNT }, (_, i) => scene(i, "2:1")));

  const cardRequest: CharacterPortraitRequest = { photoKeys: [], appearance: {}, style };
  const { images } = await withAiJob({ projectId: null, kind: "character_card", params: { style } }, () =>
    getImageProvider().characterCard(cardRequest)
  );

  const demo: DemoIllustrations = {
    square,
    wide,
    heroFullBody: { key: images.fullBody.storageKey },
    heroPortrait: { key: images.portrait.storageKey },
  };
  await storage.put(manifestKey(style), Buffer.from(JSON.stringify(demo)), "application/json");
  return demo;
}
