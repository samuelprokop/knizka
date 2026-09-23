import "server-only";

import { db, schema } from "@/db";
import type { consentType } from "@/db/schema";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";

/*
  Uloženie súhlasu s časom, zariadením a znením textu (S2). Balík F pripraví
  jednotnú funkciu v server/privacy – potom sa toto volanie presmeruje tam.
*/

export type ConsentType = (typeof consentType.enumValues)[number];

export type ConsentRecord = {
  type: ConsentType;
  granted: boolean;
  /** Kľúč textu, ktorý zákazník videl pri zaškrtnutí. */
  textKey: MessageKey;
  characterId?: string;
};

export async function recordConsents(
  projectId: string,
  records: ConsentRecord[],
  context: { language: BookLanguage; userAgent: string | null }
) {
  if (records.length === 0) return;
  await db.insert(schema.consents).values(
    records.map((r) => ({
      projectId,
      characterId: r.characterId ?? null,
      type: r.type,
      granted: r.granted,
      textKey: r.textKey,
      language: context.language,
      userAgent: context.userAgent?.slice(0, 512) ?? null,
    }))
  );
}

/** Tri samostatné súhlasy pred nahratím fotky (K2.3). */
export const PHOTO_CONSENTS = [
  { type: "guardian", textKey: "photo.consent.guardian" },
  { type: "ai_processing", textKey: "photo.consent.ai" },
  { type: "photo_retention", textKey: "photo.consent.retention" },
] as const satisfies readonly { type: ConsentType; textKey: MessageKey }[];
