import "server-only";

import sharp from "sharp";

/*
  Verdikt fotky do 3 sekúnd (K2.2): vhodná / použiteľná s radou / nevhodná
  s dôvodom. Ostrosť, jas a rozlíšenie sa merajú skutočne (lokálne, cez sharp –
  netreba platené AI). Počet tvárí, pozu, okuliare a moderáciu obsahu (K2.5)
  zatiaľ nevieme overiť bez modelu – tieto dôvody sú v type pripravené, kým
  firma nedodá prístup k vhodnej službe; bez biometrie (I10) sa nikdy neoverí
  totožnosť, len prítomnosť/kvalita.
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

const MIN_GOOD_SIDE = 700;
const MIN_USABLE_SIDE = 300;
const SHARPNESS_BAD = 4;
const SHARPNESS_SOFT = 10;
const BRIGHTNESS_DARK = 35;
const BRIGHTNESS_DIM = 70;

async function sizeOnlyVerdict({ data, width, height }: PhotoCheckInput): Promise<PhotoVerdict> {
  if (data.length < 2_000) return { verdict: "bad", reason: "blur" };
  const side = Math.min(width ?? 1024, height ?? 1024);
  if (side < MIN_USABLE_SIDE) return { verdict: "bad", reason: "small_face" };
  if (side < MIN_GOOD_SIDE) return { verdict: "ok", advice: "closer" };
  return { verdict: "good" };
}

/** Smerodajná odchýlka Laplaciánu (hrán) – nízka hodnota znamená rozmazaný obrázok. */
async function sharpnessStdev(data: Buffer): Promise<number> {
  const { channels } = await sharp(data)
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .stats();
  return channels[0].stdev;
}

async function meanBrightness(data: Buffer): Promise<number> {
  const { channels } = await sharp(data).stats();
  const rgb = channels.slice(0, 3);
  return rgb.reduce((sum, c) => sum + c.mean, 0) / rgb.length;
}

/** Skutočná lokálna kontrola ostrosti, jasu a rozlíšenia; bez rozpoznania tváre padá späť na veľkosť. */
export const heuristicPhotoChecker: PhotoChecker = {
  id: "heuristic",
  async check(input) {
    let metadata: { width?: number; height?: number };
    try {
      metadata = await sharp(input.data).metadata();
    } catch {
      // Nedekódovateľné dáta (napr. testovacia atrapa) – posúdime aspoň podľa veľkosti.
      return sizeOnlyVerdict(input);
    }

    const side = Math.min(input.width ?? metadata.width ?? 0, input.height ?? metadata.height ?? 0);
    if (side < MIN_USABLE_SIDE) return { verdict: "bad", reason: "small_face" };

    const [sharpness, brightness] = await Promise.all([sharpnessStdev(input.data), meanBrightness(input.data)]);
    if (sharpness < SHARPNESS_BAD) return { verdict: "bad", reason: "blur" };
    if (brightness < BRIGHTNESS_DARK) return { verdict: "bad", reason: "dark" };
    if (brightness < BRIGHTNESS_DIM) return { verdict: "ok", advice: "light" };
    if (sharpness < SHARPNESS_SOFT || side < MIN_GOOD_SIDE) return { verdict: "ok", advice: "closer" };
    return { verdict: "good" };
  },
};

export const getPhotoChecker = (): PhotoChecker => heuristicPhotoChecker;
