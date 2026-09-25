import type { StyleId } from "@/config/catalog";
import type { CharacterPortraitRequest } from "@/server/ai";

export type SpreadIllustrationPayload = {
  pageId: string;
  style: StyleId;
  layout: string;
  scene: string;
  characterCardKeys: string[];
  aspect: "1:1" | "2:1";
};

export type SpreadEditPayload = SpreadIllustrationPayload & { instruction: string };

export type StylePortraitPayload = {
  cardId: string;
  request: CharacterPortraitRequest;
};

export type CharacterCardPayload = {
  cardId: string;
  request: CharacterPortraitRequest;
};

/** Naplánovaný e-mail (retencia): pripomienka nedokončenej knihy, žiadosť o recenziu. */
export type LifecycleEmailKind = "reminder_preview" | "reminder_cart" | "review_request";
export type LifecycleEmailPayload = { kind: LifecycleEmailKind };

export type JobPayloadByType = {
  spread_illustration: SpreadIllustrationPayload;
  spread_edit: SpreadEditPayload;
  style_portrait: StylePortraitPayload;
  character_card: CharacterCardPayload;
  lifecycle_email: LifecycleEmailPayload;
};

export type JobType = keyof JobPayloadByType;

export type JobContext = { projectId: string | null; attempt: number };

export interface JobHandler<T extends JobType> {
  /** Spracuje úlohu; hodenie výnimky = pokus zlyhal (adaptér alebo QA „pregenerovať“), fronta to skúsi znova. */
  run(payload: JobPayloadByType[T], ctx: JobContext): Promise<void>;
  /** Po vyčerpaní pokusov – zapíše konečný stav (needs_review / failed) na súvisiaci riadok. */
  onExhausted(payload: JobPayloadByType[T], ctx: JobContext): Promise<void>;
}

/**
 * Voľne typovaný handler pre registry (skutočný typ payloadu sa rieši za behu
 * podľa `type` úlohy) – kontrolu typu zabezpečuje `JobHandler<T>` pri definícii
 * konkrétneho handlera.
 */
export interface AnyJobHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(payload: any, ctx: JobContext): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onExhausted(payload: any, ctx: JobContext): Promise<void>;
}
