/*
  Naplánované e-maily (retencia): najviac jeden na projekt a druh, len s marketingovým
  súhlasom a len kým je kniha stále v stave, na ktorý e-mail reaguje.
*/

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { MARKETS } from "@/config/markets";

type Modules = {
  db: typeof import("@/db");
  projects: typeof import("@/features/configurator/server/projects");
  lifecycle: typeof import("./lifecycle");
  handler: typeof import("./handlers/lifecycle-email");
  email: typeof import("@/server/email");
};

let m: Modules;
const created: string[] = [];
const sent: { kind: string; to: string }[] = [];

async function project(marketingConsent: boolean) {
  const { project } = await m.projects.createProject({
    market: MARKETS.sk,
    child: { name: "Janko", gender: "boy", age: 5, bookLanguage: "sk", occasion: "birthday", editedForms: null, indeclinable: false },
    email: `lifecycle-${Date.now()}@example.com`,
    marketingConsent,
    userAgent: "test",
  });
  created.push(project.id);
  return project;
}

async function setStatus(id: string, status: "preview" | "approved_by_customer" | "paid") {
  const { eq } = await import("drizzle-orm");
  await m.db.db.update(m.db.schema.projects).set({ status }).where(eq(m.db.schema.projects.id, id));
}

const run = (projectId: string, kind: "reminder_preview" | "reminder_cart") =>
  m.handler.lifecycleEmailHandler.run({ kind }, { projectId, attempt: 1 });

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test" });
  m = {
    db: await import("@/db"),
    projects: await import("@/features/configurator/server/projects"),
    lifecycle: await import("./lifecycle"),
    handler: await import("./handlers/lifecycle-email"),
    email: await import("@/server/email"),
  };
  m.email.getMailer().send = async (mail) => {
    sent.push({ kind: mail.kind, to: mail.to });
  };
});

after(async () => {
  const { db, schema } = m.db;
  const { inArray } = await import("drizzle-orm");
  if (created.length) {
    await db.delete(schema.consents).where(inArray(schema.consents.projectId, created));
    await db.delete(schema.jobs).where(inArray(schema.jobs.projectId, created));
    await db.delete(schema.projects).where(inArray(schema.projects.id, created));
  }
  await (globalThis as unknown as { pgPool?: { end(): Promise<void> } }).pgPool?.end();
});

describe("naplánované e-maily", () => {
  it("rovnaký druh sa naplánuje na projekt len raz", async () => {
    const p = await project(true);
    const later = new Date(Date.now() + 86_400_000);
    assert.ok(await m.lifecycle.scheduleLifecycleEmail(p.id, "reminder_preview", later));
    assert.equal(await m.lifecycle.scheduleLifecycleEmail(p.id, "reminder_preview", later), null);
    assert.ok(await m.lifecycle.scheduleLifecycleEmail(p.id, "reminder_cart", later));
  });

  it("pripomienka príde len so súhlasom a kým kniha čaká", async () => {
    const withConsent = await project(true);
    const without = await project(false);
    await setStatus(withConsent.id, "preview");
    await setStatus(without.id, "preview");
    sent.length = 0;

    await run(without.id, "reminder_preview");
    assert.equal(sent.length, 0, "bez marketingového súhlasu sa nepripomína (A3)");

    await run(withConsent.id, "reminder_preview");
    assert.deepEqual(sent.map((s) => s.kind), ["reminder"]);

    // Medzitým knihu schválil – pripomienka náhľadu už nemá zmysel, košíková áno.
    sent.length = 0;
    await setStatus(withConsent.id, "approved_by_customer");
    await run(withConsent.id, "reminder_preview");
    assert.equal(sent.length, 0);
    await run(withConsent.id, "reminder_cart");
    assert.equal(sent.length, 1);

    // Zaplatená kniha sa už nepripomína.
    sent.length = 0;
    await setStatus(withConsent.id, "paid");
    await run(withConsent.id, "reminder_cart");
    assert.equal(sent.length, 0);
  });
});
