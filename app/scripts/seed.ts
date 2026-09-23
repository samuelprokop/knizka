/*
  Vývojové dáta: štartovací slovník mien a vzorový príbeh.
  Spúšťa sa: npm run db:seed (idempotentné – pri opakovaní záznamy aktualizuje).
  Poznámka: nepoužíva "@/db", lebo ten je "server-only" (len pre Next.js).
*/

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../src/db/schema";
import { SEED_NAMES } from "../src/lib/language/seed-names";
import { importNameDictionary } from "./names/import";
import { SAMPLE_EDITIONS } from "./seed-story";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedNames() {
  for (const entry of SEED_NAMES) {
    const values = {
      language: entry.language,
      name: entry.forms.N,
      gender: entry.gender,
      forms: entry.forms,
      declinable: entry.declinable ?? true,
      diminutives: entry.diminutives ?? [],
      baseName: entry.baseName ?? null,
      source: "manual",
      // Neoverené korektorom – kým ich neprejde jazykový balík.
      verified: false,
    };
    await db
      .insert(schema.nameDictionary)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.nameDictionary.language, schema.nameDictionary.name, schema.nameDictionary.gender],
        set: values,
      });
  }
  console.log(`Mená: ${SEED_NAMES.length}`);
}

async function seedStories() {
  const [story] = await db
    .insert(schema.stories)
    .values({
      slug: "prvy-den-v-skolke",
      category: "milestones",
      ageMin: 3,
      ageMax: 5,
      spreads: 12,
      styles: ["watercolor", "modern", "animated", "crayon"],
      companionSlots: 1,
      published: true,
    })
    .onConflictDoUpdate({ target: schema.stories.slug, set: { published: true } })
    .returning();

  const editions = SAMPLE_EDITIONS;

  for (const edition of editions) {
    await db
      .insert(schema.storyEditions)
      .values({ storyId: story.id, version: 1, author: "Redakcia TAKTIK (vzorový text)", detailSlots: ["toy", "kindergarten", "teacher"], ...edition })
      .onConflictDoUpdate({
        target: [schema.storyEditions.storyId, schema.storyEditions.language, schema.storyEditions.version],
        set: edition,
      });
  }
  console.log(`Príbehy: 1 (${editions.length} edície)`);
}

async function main() {
  await seedNames();
  // Plný slovník (J1) z app/data/names – overené záznamy korektora ostávajú.
  await importNameDictionary(db);
  await seedStories();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
