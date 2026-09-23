import "server-only";

import { z } from "zod";

import { ValidationError } from "../server/projects";
import { APPEARANCE_CHOICES, type Appearance } from "../model";

/* Schémy vstupov zdieľané viacerými akciami (mimo "use server", aby sa nestali koncovými bodmi). */

const appearanceSchema: z.ZodType<Appearance> = z.object({
  hairColor: z.enum(APPEARANCE_CHOICES.hairColor.ids).optional(),
  hairLength: z.enum(APPEARANCE_CHOICES.hairLength.ids).optional(),
  hairstyle: z.enum(APPEARANCE_CHOICES.hairstyle.ids).optional(),
  eyes: z.enum(APPEARANCE_CHOICES.eyes.ids).optional(),
  skin: z.enum(APPEARANCE_CHOICES.skin.ids).optional(),
  glasses: z.boolean().optional(),
  freckles: z.boolean().optional(),
  braces: z.boolean().optional(),
  hearingAid: z.boolean().optional(),
  wheelchair: z.boolean().optional(),
  outfitColor: z.enum(APPEARANCE_CHOICES.outfitColor.ids).optional(),
  accessory: z.enum(APPEARANCE_CHOICES.accessory.ids).optional(),
  petKind: z.string().max(30).optional(),
  petColor: z.string().max(30).optional(),
});

export function parseAppearance(input: unknown): Appearance {
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("error.generic");
  return parsed.data;
}

