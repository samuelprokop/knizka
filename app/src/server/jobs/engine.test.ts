/*
  Testy jadra fronty (pokus, odloženie, vyčerpanie – N3, N5). Úlohu vkladáme
  rovno v stave "running" a spracúvame priamo cez processClaimedJob, aby test
  neťahal zdieľanú frontu (jobs) globálnym claimom – iné testovacie súbory bežia
  súbežne nad tou istou DB a mohli by si úlohu vzájomne „ukradnúť“.
*/
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

type Modules = {
  db: typeof import("@/db");
  registry: typeof import("./registry");
  engine: typeof import("./engine");
};

let m: Modules;
const jobIds: string[] = [];

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test" });
  m = {
    db: await import("@/db"),
    registry: await import("./registry"),
    engine: await import("./engine"),
  };
});

after(async () => {
  const { db, schema } = m.db;
  const { inArray } = await import("drizzle-orm");
  if (jobIds.length) await db.delete(schema.jobs).where(inArray(schema.jobs.id, jobIds));
  await (globalThis as unknown as { pgPool?: { end(): Promise<void> } }).pgPool?.end();
});

/** Vloží testovaciu úlohu rovno v stave „running“, akoby ju už fronta vyzdvihla. */
async function insertRunningJob(type: string, attempts: number, maxAttempts: number) {
  const { db, schema } = m.db;
  const [row] = await db
    .insert(schema.jobs)
    .values({ type, projectId: null, payload: { marker: type }, status: "running", attempts, maxAttempts })
    .returning();
  jobIds.push(row.id);
  return row;
}

async function reread(id: string) {
  const { db, schema } = m.db;
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
  return row;
}

describe("fronta úloh: pokusy, odloženie a vyčerpanie (processClaimedJob)", () => {
  it("dva neúspešné pokusy vrátia úlohu do fronty, tretí uspeje", async () => {
    let calls = 0;
    const registry = m.registry.registry as unknown as Record<string, { run: () => Promise<void>; onExhausted: () => Promise<void> }>;
    registry.test_flaky_ok = {
      async run() {
        calls += 1;
        if (calls < 3) throw new Error("simulovaný výpadok adaptéra");
      },
      async onExhausted() {
        throw new Error("nemalo sa zavolať – tretí pokus mal uspieť");
      },
    };

    try {
      let row = await insertRunningJob("test_flaky_ok", 1, 3);
      await m.engine.processClaimedJob(row);
      row = await reread(row.id);
      assert.equal(row.status, "queued");
      assert.equal(calls, 1);

      row = { ...row, attempts: 2 };
      await m.engine.processClaimedJob(row);
      row = await reread(row.id);
      assert.equal(row.status, "queued");
      assert.equal(calls, 2);

      row = { ...row, attempts: 3 };
      await m.engine.processClaimedJob(row);
      row = await reread(row.id);
      assert.equal(row.status, "succeeded");
      assert.equal(calls, 3);
    } finally {
      delete registry.test_flaky_ok;
    }
  });

  it("po vyčerpaní pokusov je úloha failed a zavolá sa onExhausted", async () => {
    let exhaustedPayload: unknown = null;
    const registry = m.registry.registry as unknown as Record<string, { run: () => Promise<void>; onExhausted: (payload: unknown) => Promise<void> }>;
    registry.test_flaky_dead = {
      async run() {
        throw new Error("adaptér nedostupný");
      },
      async onExhausted(payload) {
        exhaustedPayload = payload;
      },
    };

    try {
      const row = await insertRunningJob("test_flaky_dead", 2, 2);
      await m.engine.processClaimedJob(row);
      const after = await reread(row.id);
      assert.equal(after.status, "failed");
      assert.match(after.error ?? "", /adaptér nedostupný/);
      assert.deepEqual(exhaustedPayload, { marker: "test_flaky_dead" });
    } finally {
      delete registry.test_flaky_dead;
    }
  });

  it("neznámy typ úlohy sa rovno označí ako failed", async () => {
    const row = await insertRunningJob("test_unknown_type", 1, 3);
    await m.engine.processClaimedJob(row);
    const after = await reread(row.id);
    assert.equal(after.status, "failed");
    assert.match(after.error ?? "", /neznámy typ úlohy/);
  });
});
