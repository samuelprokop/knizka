/*
  Príprava náhľadu UI: oddelená DB knizka_ui a úložisko .storage-ui, migrácie,
  základné dáta (mená, príbeh) a ukážkové projekty. Vývojová DB ostáva nedotknutá.
  Spúšťa sa: npm run ui:setup (znova kedykoľvek – ukážky sa vytvoria nanovo).
*/

import { execSync } from "node:child_process";

import { UI_ENV } from "./env.mjs";

const run = (command) => execSync(command, { stdio: "inherit", env: { ...process.env, ...UI_ENV } });

try {
  execSync("createdb knizka_ui", { stdio: "ignore" });
  console.log("Vytvorená DB knizka_ui.");
} catch {
  // DB už existuje.
}

run("npx drizzle-kit migrate");
run("npx tsx scripts/seed.ts");
run("npx tsx --conditions=react-server scripts/ui-preview/seed.ts");
