import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import { heuristicPhotoChecker } from "./photo-checker";

const SIDE = 800;

/** Ostrý, dobre osvetlený obrázok (šachovnica – veľa hrán). */
async function sharpBrightImage(): Promise<Buffer> {
  const cell = 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}">
    <rect width="100%" height="100%" fill="#e8e8e8"/>
    ${Array.from({ length: SIDE / cell }, (_, row) =>
      Array.from({ length: SIDE / cell }, (_, col) =>
        (row + col) % 2 === 0 ? `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#202020"/>` : ""
      ).join("")
    ).join("")}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

/** Rozmazaná verzia toho istého obrázka – rovnaký jas, oveľa menej hrán. */
async function blurredImage(): Promise<Buffer> {
  const base = await sharpBrightImage();
  return sharp(base).blur(20).jpeg().toBuffer();
}

/** Tmavá, no ostrá fotka (šachovnica v tmavých odtieňoch) – jednoliata farba by mala nulovú
 *  ostrosť a spadla by pod „blur“ skôr, než sa vôbec vyhodnotí jas, čo reálnu tmavú fotku neverne
 *  predstavuje. */
async function darkImage(): Promise<Buffer> {
  const cell = 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}">
    <rect width="100%" height="100%" fill="#050505"/>
    ${Array.from({ length: SIDE / cell }, (_, row) =>
      Array.from({ length: SIDE / cell }, (_, col) =>
        (row + col) % 2 === 0 ? `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#1e1e1e"/>` : ""
      ).join("")
    ).join("")}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function tinyImage(): Promise<Buffer> {
  return sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 200, b: 200 } } }).jpeg().toBuffer();
}

describe("heuristická kontrola fotky (K2.2) – ostrosť, jas, rozlíšenie", () => {
  it("ostrá, dobre osvetlená a dostatočne veľká fotka je dobrá", async () => {
    const data = await sharpBrightImage();
    const verdict = await heuristicPhotoChecker.check({ data, contentType: "image/jpeg" });
    assert.deepEqual(verdict, { verdict: "good" });
  });

  it("rozmazaná fotka sa zamietne s dôvodom blur", async () => {
    const data = await blurredImage();
    const verdict = await heuristicPhotoChecker.check({ data, contentType: "image/jpeg" });
    assert.deepEqual(verdict, { verdict: "bad", reason: "blur" });
  });

  it("príliš tmavá fotka sa zamietne s dôvodom dark", async () => {
    const data = await darkImage();
    const verdict = await heuristicPhotoChecker.check({ data, contentType: "image/jpeg" });
    assert.deepEqual(verdict, { verdict: "bad", reason: "dark" });
  });

  it("príliš malá fotka sa zamietne bez ohľadu na kvalitu", async () => {
    const data = await tinyImage();
    const verdict = await heuristicPhotoChecker.check({ data, contentType: "image/jpeg" });
    assert.deepEqual(verdict, { verdict: "bad", reason: "small_face" });
  });

  it("nedekódovateľné dáta padnú späť na kontrolu podľa veľkosti (zachováva starý mock kontrakt)", async () => {
    const data = Buffer.alloc(4_000, 1);
    const verdict = await heuristicPhotoChecker.check({ data, contentType: "image/jpeg", width: 1000, height: 1250 });
    assert.deepEqual(verdict, { verdict: "good" });
  });
});
