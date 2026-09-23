import "server-only";

/*
  Verdikt fotky do 3 sekúnd (K2.2): vhodná / použiteľná s radou / nevhodná
  s dôvodom. Rozhranie je pripravené pre balík B (server/qa) – ten dodá
  skutočnú kontrolu ostrosti, jasu, veľkosti a počtu tvárí, bez biometrie (I10),
  aj moderáciu obsahu (K2.5). Konfigurátor volá len getPhotoChecker().
*/

export type PhotoReason =
  | "blur"
  | "dark"
  | "small_face"
  | "profile"
  | "multiple"
  | "no_face"
  | "covered"
  | "glasses"
  | "screenshot";

export type PhotoAdvice = "closer" | "light";

export type PhotoVerdict =
  | { verdict: "good" }
  | { verdict: "ok"; advice: PhotoAdvice }
  | { verdict: "bad"; reason: PhotoReason }
  /** Nevhodný obsah – nespracuje sa, projekt sa označí na ručné preverenie. */
  | { verdict: "rejected" };

export type PhotoCheckInput = {
  data: Buffer;
  contentType: string;
  /** Rozmery po oreze v prehliadači (pri HEIC bez orezu nemusia byť známe). */
  width?: number;
  height?: number;
};

export interface PhotoChecker {
  readonly id: string;
  check(input: PhotoCheckInput): Promise<PhotoVerdict>;
}

/** Mock: posudzuje len rozlíšenie, aby sa dali vyskúšať všetky tri verdikty. */
export const mockPhotoChecker: PhotoChecker = {
  id: "mock",
  async check({ width, height, data }) {
    if (data.length < 2_000) return { verdict: "bad", reason: "blur" };
    const side = Math.min(width ?? 1024, height ?? 1024);
    if (side < 300) return { verdict: "bad", reason: "small_face" };
    if (side < 700) return { verdict: "ok", advice: "closer" };
    return { verdict: "good" };
  },
};

export const getPhotoChecker = (): PhotoChecker => mockPhotoChecker;
