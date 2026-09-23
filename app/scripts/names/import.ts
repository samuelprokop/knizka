/*
  Import slovníka mien do DB (J1, J8):  npm run names:import
  Zdroj: app/data/names/{sk,cs}.json (npm run names:build).

  - Nové mená a zmeny tvarov prídu s verified = false – overuje korektor.
  - Záznam už overený korektorom (verified = true) sa NEPREPÍŠE – doplnia sa len
    meniny a domácke podoby. Ručná práca korektora má prednosť pred zdrojom.
*/

import { and, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";

import * as schema from "../../src/db/schema";
import type { DictionaryFile } from "./types";
import { DATA_DIR } from "./wiki";

type Db = NodePgDatabase<typeof schema>;

async function importLanguage(db: Db, lang: "sk" | "cs") {
  const file = JSON.parse(await readFile(path.join(DATA_DIR, `${lang}.json`), "utf8")) as DictionaryFile;
  const existing = await db
    .select({ name: schema.nameDictionary.name, gender: schema.nameDictionary.gender, verified: schema.nameDictionary.verified })
    .from(schema.nameDictionary)
    .where(eq(schema.nameDictionary.language, lang));
  const verified = new Set(existing.filter((e) => e.verified).map((e) => `${e.name}|${e.gender}`));

  let inserted = 0;
  let kept = 0;
  for (const entry of file.entries) {
    const extras = { diminutives: entry.diminutives, nameDays: entry.nameDays, baseName: entry.baseName };
    if (verified.has(`${entry.name}|${entry.gender}`)) {
      await db
        .update(schema.nameDictionary)
        .set(extras)
        .where(
          and(
            eq(schema.nameDictionary.language, lang),
            eq(schema.nameDictionary.name, entry.name),
            eq(schema.nameDictionary.gender, entry.gender)
          )
        );
      kept++;
      continue;
    }
    const values = {
      language: lang,
      name: entry.name,
      gender: entry.gender,
      forms: entry.forms,
      declinable: entry.declinable,
      source: entry.source,
      verified: false,
      ...extras,
    };
    await db
      .insert(schema.nameDictionary)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.nameDictionary.language, schema.nameDictionary.name, schema.nameDictionary.gender],
        set: values,
      });
    inserted++;
  }
  console.log(`${lang}: ${inserted} zapísaných, ${kept} overených korektorom ponechaných`);
}

/** Volá aj scripts/seed.ts, aby `npm run db:seed` naplnil celý slovník. */
export async function importNameDictionary(db: Db) {
  await importLanguage(db, "sk");
  await importLanguage(db, "cs");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  importNameDictionary(drizzle(pool, { schema }))
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
