/*
  Náhľad UI: Next.js nad ukážkovými dátami, bez workera a bez zápisov
  (UI_PREVIEW=1). Katalóg obrazoviek: http://localhost:3100/ui
*/

import { spawn } from "node:child_process";

import { UI_ENV } from "./env.mjs";

const next = spawn("node_modules/.bin/next", ["dev", "-p", "3100", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ...UI_ENV, UI_PREVIEW: "1", NEXT_DIST_DIR: ".next-ui" },
});
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => next.kill("SIGTERM"));
next.on("exit", (code) => process.exit(code ?? 0));
