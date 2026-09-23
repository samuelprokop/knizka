import "server-only";

import type { StyleId } from "@/config/catalog";
import type { MarketCode } from "@/config/markets";
import type { StorySpread } from "@/db/schema";
import type { BookLanguage } from "@/i18n/locales";
import type { NameContext } from "@/lib/language";

import type { SampleSpreadData } from "../components/SampleSpread";
import { zoneFromScene } from "../model/build";
import { personalize } from "../model/text";
import type { BookImage } from "../model/types";
import { getDemoIllustrations } from "./illustrations";
import { PREVIEW_IMAGE_WIDTH, signedMediaUrl } from "./media";

/**
 * Dáta ukážkovej dvojstrany pre krok 6 (balík A).
 *
 * @param spread prvá dvojstrana edície príbehu (story_editions.spreads[0])
 * @param name   tvary mena potvrdené v kroku 1 (resolveName → NameContext)
 * @param scenes ilustrácie scény s hrdinom, ak už existujú; inak ukážkové z mock adaptéra štýlu
 */
export async function getSampleSpreadData(params: {
  market: MarketCode;
  language: BookLanguage;
  name: NameContext;
  spread: StorySpread;
  style: StyleId;
  scenes?: { square?: BookImage | null; wide?: BookImage | null };
}): Promise<SampleSpreadData> {
  const demo = params.scenes?.square && params.scenes?.wide ? null : await getDemoIllustrations(params.style);
  const square = params.scenes?.square ?? demo?.square[0] ?? null;
  const wide = params.scenes?.wide ?? demo?.wide[0] ?? null;
  const url = (image: BookImage | null) =>
    image ? signedMediaUrl(params.market, image.key, { width: PREVIEW_IMAGE_WIDTH }) : null;

  return {
    language: params.language,
    text: personalize(params.spread.text, params.name, params.language, params.spread.fallbackText),
    illustrations: { square: url(square), wide: url(wide) },
    textZone: zoneFromScene(params.spread.scene),
  };
}
