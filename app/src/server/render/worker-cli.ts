/*
  Render worker: samostatný Node proces, ktorý z knihy vyrobí PDF.
  Next.js nedovoľuje react-dom/server v route handleroch, a PDF je aj tak
  práca na pozadí (po platbe) – preto beží mimo servera aplikácie.

    tsx src/server/render/worker-cli.ts <druh>   < kniha.json   > kniha.pdf

  Obrázky číta priamo z úložiska (STORAGE_DIR), len z priestorov knihy.
*/

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Book } from "@/features/book/model/types";
import { imageContentType, isServableKey } from "@/features/book/storage-keys";
import { closeRenderBrowser, renderBookPdf, type AssetLoader } from "./pdf";
import { PDF_KINDS } from "./types";

const root = path.resolve(process.env.STORAGE_DIR ?? "./.storage");

const loadAsset: AssetLoader = async (key) => {
  const contentType = imageContentType(key);
  const file = path.resolve(root, key);
  if (!isServableKey(key) || !contentType || !file.startsWith(root + path.sep)) {
    throw new Error(`Kľúč nie je obrázok knihy: ${key}`);
  }
  return { body: await readFile(file), contentType };
};

async function main() {
  const kind = PDF_KINDS.find((k) => k === process.argv[2]);
  if (!kind) throw new Error(`Neznámy druh PDF: ${process.argv[2]}`);
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const book = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Book;
  const { bytes } = await renderBookPdf(book, kind, loadAsset);
  process.stdout.write(bytes);
  await closeRenderBrowser();
}

main().catch(async (error) => {
  console.error(error);
  await closeRenderBrowser();
  process.exit(1);
});
