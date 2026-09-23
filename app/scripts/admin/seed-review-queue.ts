/*
  Vývojová pomôcka: založí projekt v stave "paid" so stranami, aby sa dala
  vyskúšať fronta grafika a redaktora (balík E) bez čakania na balíky B/D,
  ktoré túto cestu (platba → in_review) zatiaľ nevedú.

  Spúšťa sa: npm run admin:seed-queue (idempotentné – zmaže a znova založí
  projekty s prefixom "Ukážka fronty").
*/

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "../../src/db/schema";
import { SK_SPREADS } from "../seed-story";

const MARK = "Ukážka fronty";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const stale = await db.select({ id: schema.characters.id, projectId: schema.characters.projectId }).from(schema.characters).where(eq(schema.characters.name, MARK));
  for (const row of stale) await db.delete(schema.projects).where(eq(schema.projects.id, row.projectId));

  const [project] = await db
    .insert(schema.projects)
    .values({
      market: "sk",
      bookLanguage: "sk",
      status: "paid",
      currentStep: 9,
      styleId: "watercolor",
      layoutId: "classic",
      format: "A5",
      pageCount: 32,
    })
    .returning();

  const [hero] = await db
    .insert(schema.characters)
    .values({ projectId: project.id, role: "hero", name: MARK, gender: "boy", age: 5, appearanceSource: "description" })
    .returning();

  await db.insert(schema.characterCards).values({
    characterId: hero.id,
    styleId: "watercolor",
    version: 1,
    status: "approved",
    images: { portrait: "mock/watercolor/portrait-1.svg" },
    approvedAt: new Date(),
  });

  const [book] = await db.insert(schema.bookVersions).values({ projectId: project.id, version: 1, snapshot: {}, lockedAt: new Date() }).returning();

  await db.insert(schema.bookPages).values(
    SK_SPREADS.map((spread, index) => {
      const position = index + 1;
      return {
        bookVersionId: book.id,
        position,
        kind: "story_spread",
        text: spread.text,
        illustrationKey: "mock/watercolor/scene-1.svg",
        layoutId: "classic",
        status: position === 4 ? "needs_review" : "ready",
        editedByCustomer: position === 7,
        qa: position === 9 ? { reports: ["Obrázok nesedí s textom."] } : null,
      } satisfies typeof schema.bookPages.$inferInsert;
    })
  );

  console.log(`Ukážkový projekt vo fronte: ${project.id} (hrdina „${MARK}“, stav paid).`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
