import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

import type { Book } from "@/features/book/model/types";
import type { PdfKind } from "./types";

export { PDF_KINDS, type PdfKind } from "./types";

/*
  Vstupný bod pre aplikáciu (route handlery, úlohy po platbe): PDF z knihy cez
  render worker (worker-cli.ts) v samostatnom procese. Vstup je model knihy
  (JSON cez stdin), výstup bajty PDF. Fotky ani iné súbory mimo knihy worker nečíta.

  PLACEHOLDER výkonu: každé volanie spúšťa nový proces (~1 – 2 s navyše). Pre
  produkciu dlhodobo bežiaci worker s frontou (výroba e-knihy po platbe, balík D).
*/

const TSX = path.join(process.cwd(), "node_modules", ".bin", "tsx");
const WORKER = path.join(process.cwd(), "src", "server", "render", "worker-cli.ts");
const TIMEOUT_MS = 120_000;

export function renderBookPdfInWorker(book: Book, kind: PdfKind): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(TSX, [WORKER, kind], { cwd: process.cwd(), env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`Render PDF zlyhal (${code}): ${Buffer.concat(err).toString("utf8").slice(0, 2000)}`));
    });
    child.stdin.end(JSON.stringify(book));
  });
}
