import "server-only";

import { characterCardHandler } from "./handlers/character-card";
import { spreadEditHandler } from "./handlers/spread-edit";
import { spreadIllustrationHandler } from "./handlers/spread-illustration";
import { stylePortraitHandler } from "./handlers/style-portrait";
import type { AnyJobHandler, JobType } from "./types";

export const registry: Record<JobType, AnyJobHandler> = {
  spread_illustration: spreadIllustrationHandler,
  spread_edit: spreadEditHandler,
  style_portrait: stylePortraitHandler,
  character_card: characterCardHandler,
};
