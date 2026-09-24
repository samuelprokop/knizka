/*
  Testy bežia nad vlastnou DB knizka_test – nie nad vývojovou knizka_dev, nad
  ktorou beží worker `npm run dev` (bral by testom úlohy z fronty). Pred testami
  sa DB vytvorí, zmigruje a pri prvom behu naplní základnými dátami.
*/

import { execSync } from "node:child_process";

import pg from "pg";

export const TEST_DATABASE_URL = "postgres://localhost:5432/knizka_test";
const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };

try {
  execSync("createdb knizka_test", { stdio: "ignore" });
} catch {
  // DB už existuje.
}
execSync("npx drizzle-kit migrate", { env, stdio: ["ignore", "ignore", "inherit"] });

const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
await client.connect();
const { rows } = await client.query("select count(*)::int as n from name_dictionary");
await client.end();
if (rows[0].n === 0) execSync("npx tsx scripts/seed.ts", { env, stdio: "inherit" });
