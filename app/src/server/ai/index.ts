import "server-only";

import { mockImageProvider, mockTextProvider } from "./mock";
import type { ImageProvider, TextProvider } from "./types";

/*
  Register adaptérov. Nový poskytovateľ = nový súbor s implementáciou
  ImageProvider/TextProvider + záznam sem. Záložný adaptér pri výpadku (N5)
  sa doplní, keď budú aspoň dva reálne.
*/

const IMAGE_PROVIDERS: Record<string, ImageProvider> = { mock: mockImageProvider };
const TEXT_PROVIDERS: Record<string, TextProvider> = { mock: mockTextProvider };

export function getImageProvider(): ImageProvider {
  const id = process.env.AI_IMAGE_PROVIDER ?? "mock";
  const provider = IMAGE_PROVIDERS[id];
  if (!provider) throw new Error(`Neznámy AI_IMAGE_PROVIDER: ${id}`);
  return provider;
}

export function getTextProvider(): TextProvider {
  const id = process.env.AI_TEXT_PROVIDER ?? "mock";
  const provider = TEXT_PROVIDERS[id];
  if (!provider) throw new Error(`Neznámy AI_TEXT_PROVIDER: ${id}`);
  return provider;
}

export type * from "./types";
