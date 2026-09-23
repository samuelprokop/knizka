/*
  Integračné testy servisnej vrstvy konfigurátora – to, čo robia server
  actions po overení prístupu. Bežia proti DATABASE_URL z .env.local
  (vývojová DB s migráciami a seedom); vytvorené projekty na konci zmažú.
*/

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { MARKETS } from "@/config/markets";

type Modules = {
  db: typeof import("@/db");
  projects: typeof import("./projects");
  hero: typeof import("./hero");
  story: typeof import("./story");
  book: typeof import("./book");
  bundle: typeof import("./bundle");
  tokens: typeof import("./tokens");
  consents: typeof import("./consents");
};

let m: Modules;
const created: string[] = [];
const email = `test-${Date.now()}@example.com`;

const child = (over: Partial<import("./projects").ChildInput> = {}): import("./projects").ChildInput => ({
  name: "Janko",
  gender: "boy",
  age: 5,
  bookLanguage: "sk",
  occasion: "birthday",
  editedForms: null,
  indeclinable: false,
  ...over,
});

// Najmenší platný JPEG nie je potrebný – mock kontrola posudzuje len veľkosť a rozmery.
const fakePhoto = Buffer.alloc(4_000, 1);

async function newProject(over: Partial<import("./projects").ChildInput> = {}) {
  const { project } = await m.projects.createProject({ market: MARKETS.sk, child: child(over), email, marketingConsent: false, userAgent: "test" });
  created.push(project.id);
  return project;
}

/** Projekt po krok 5 (hrdina schválený, príbeh z knižnice). */
async function projectWithStory() {
  const project = await newProject();
  const b = (await m.bundle.loadBundle(project.id))!;
  await m.hero.addPhoto({ projectId: project.id, characterId: b.hero!.id, data: fakePhoto, contentType: "image/jpeg", width: 1000, height: 1250 });
  await m.hero.finishAppearance(project.id, "photo");
  await m.hero.generateStylePortraits(project.id);
  await m.hero.chooseStyle(project.id, "watercolor");
  await m.hero.approveHeroCard(project.id);
  const [item] = await m.story.listLibrary("sk");
  await m.story.chooseLibraryStory(project.id, item.story.id, { toy: "dráčika" });
  return project;
}

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test", MOCK_AI_DELAY_MS: "0", STORAGE_DIR: await mkdtemp(path.join(tmpdir(), "knizka-test-")) });
  m = {
    db: await import("@/db"),
    projects: await import("./projects"),
    hero: await import("./hero"),
    story: await import("./story"),
    book: await import("./book"),
    bundle: await import("./bundle"),
    tokens: await import("./tokens"),
    consents: await import("./consents"),
  };
});

after(async () => {
  const { db, schema } = m.db;
  const { inArray } = await import("drizzle-orm");
  if (created.length) {
    await db.delete(schema.consents).where(inArray(schema.consents.projectId, created));
    await db.delete(schema.aiJobs).where(inArray(schema.aiJobs.projectId, created));
    await db.delete(schema.projects).where(inArray(schema.projects.id, created));
  }
  await (globalThis as unknown as { pgPool?: { end(): Promise<void> } }).pgPool?.end();
});

describe("krok 1: založenie projektu a návrat cez odkaz", () => {
  it("projekt s hrdinom, tvarmi mena a súhlasom marketingu", async () => {
    const project = await newProject();
    const b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "draft");
    assert.equal(b.project.currentStep, 2);
    assert.equal(b.project.layoutId, "classic");
    assert.equal(b.hero?.name, "Janko");
    assert.equal((b.hero?.nameForms as Record<string, string>).I, "Jankom");
    // Slovník zatiaľ nie je overený korektorom → jazyková kontrola.
    assert.equal(b.project.needsLanguageReview, true);
    const consents = await m.db.db.select().from(m.db.schema.consents).where((await import("drizzle-orm")).eq(m.db.schema.consents.projectId, project.id));
    assert.deepEqual(consents.map((c) => [c.type, c.granted]), [["marketing", false]]);
  });

  it("meno mimo slovníka: tvary z pravidiel, príznak na kontrolu", async () => {
    const name = await m.projects.resolveChildName(child({ name: "Tobiáško" }));
    assert.equal(name.needsLanguageReview, true);
    assert.equal(name.forms.N, "Tobiáško");
  });

  it("neplatné meno sa neuloží", async () => {
    await assert.rejects(() => m.projects.resolveChildName(child({ name: "X" })), m.projects.ValidationError);
  });

  it("jednorazový odkaz: platí raz, vráti posledný krok, v DB je len hash", async () => {
    const project = await newProject();
    await m.projects.touchStep(project.id, 4);
    const token = await m.projects.issueLink(project.id);
    const b = (await m.bundle.loadBundle(project.id))!;
    assert.notEqual(b.project.accessTokenHash, token);
    assert.equal(b.project.accessTokenHash, m.tokens.hashToken(token));

    assert.deepEqual(await m.projects.redeemLink(project.id, token), { market: "sk", step: 4 });
    assert.equal(await m.projects.redeemLink(project.id, token), null);
    assert.equal(await m.projects.redeemLink(project.id, "zly-token"), null);
  });

  it("nový odkaz zruší starý", async () => {
    const project = await newProject();
    const first = await m.projects.issueLink(project.id);
    const second = await m.projects.issueLink(project.id);
    assert.equal(await m.projects.redeemLink(project.id, first), null);
    assert.ok(await m.projects.redeemLink(project.id, second));
  });

  it("podpis relácie patrí len k jednému projektu", () => {
    const sig = m.tokens.signProjectSession("a");
    assert.equal(m.tokens.verifyProjectSession("a", sig), true);
    assert.equal(m.tokens.verifyProjectSession("b", sig), false);
    assert.equal(m.tokens.verifyProjectSession("a", undefined), false);
  });
});

describe("krok 2 – 3: fotka, súhlasy, Karta hrdinu", () => {
  it("fotka ide do photos/ s lehotou 7 dní; po schválení Karty najviac 24 h", async () => {
    const project = await newProject();
    let b = (await m.bundle.loadBundle(project.id))!;
    await m.consents.recordConsents(project.id, m.consents.PHOTO_CONSENTS.map((c) => ({ ...c, granted: true, characterId: b.hero!.id })), { language: "sk", userAgent: null });

    const { photoId, verdict } = await m.hero.addPhoto({ projectId: project.id, characterId: b.hero!.id, data: fakePhoto, contentType: "image/jpeg", width: 1000, height: 1250 });
    assert.equal(verdict.verdict, "good");
    b = (await m.bundle.loadBundle(project.id))!;
    const photo = b.photos.find((p) => p.id === photoId)!;
    assert.match(photo.storageKey!, new RegExp(`^photos/${project.id}/`));
    const days = (photo.deleteAfter.getTime() - Date.now()) / 86_400_000;
    assert.ok(days > 6.9 && days <= 7);

    assert.equal(await m.hero.finishAppearance(project.id, "photo"), true);
    await m.hero.generateStylePortraits(project.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(m.bundle.stylePortraits(b).filter((c) => c.status === "ready").length, 4);
    // Bez zmeny fotiek sa portréty nekreslia znova.
    assert.equal(await m.hero.finishAppearance(project.id, "photo"), false);

    await m.hero.chooseStyle(project.id, "crayon");
    await m.hero.approveHeroCard(project.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "hero_approved");
    assert.equal(m.bundle.currentCard(b, b.hero!.id, "crayon")?.status, "approved");
    const hours = (b.photos[0].deleteAfter.getTime() - Date.now()) / 3_600_000;
    assert.ok(hours <= 24 && hours > 23.9);
  });

  it("zlá fotka sa neuloží; pregenerovanie Karty má 3 pokusy", async () => {
    const project = await newProject();
    let b = (await m.bundle.loadBundle(project.id))!;
    const bad = await m.hero.addPhoto({ projectId: project.id, characterId: b.hero!.id, data: fakePhoto, contentType: "image/jpeg", width: 200, height: 250 });
    assert.equal(bad.verdict.verdict, "bad");
    assert.equal(bad.photoId, null);

    await m.hero.saveDescription(b.hero!.id, { hairColor: "blond", skin: "light" });
    await m.hero.chooseStyle(project.id, "modern");
    for (let i = 0; i < 3; i++) {
      await m.hero.generateCard({ projectId: project.id, characterId: b.hero!.id, style: "modern", reason: "face" });
    }
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(m.hero.regenerationsLeft(b, b.hero!.id, "modern"), 0);
  });
});

describe("krok 5 – 9: príbeh, generovanie, schválenie", () => {
  it("výber príbehu (cesta B) posunie stav a zachová detaily", async () => {
    const project = await projectWithStory();
    const b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "text_approved");
    assert.equal(b.project.storyPath, "B");
    assert.equal(b.storyInput.details?.toy, "dráčika");
  });

  it("cesta C: námety najviac 3 kolá, text, prepísanie 5× a schválenie", async () => {
    const project = await newProject();
    const b0 = (await m.bundle.loadBundle(project.id))!;
    await m.hero.saveDescription(b0.hero!.id, { hairColor: "red" });
    await m.hero.chooseStyle(project.id, "watercolor");
    await m.hero.approveHeroCard(project.id);

    const answers = { occasion: "birthday" as const, worlds: ["forest" as const], tone: "calm" as const };
    for (let i = 0; i < 3; i++) await m.story.requestIdeas(project.id, answers);
    await assert.rejects(() => m.story.requestIdeas(project.id, answers), m.projects.ValidationError);

    await m.story.writeFromIdea(project.id, 0);
    let b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.storyPath, "C");
    assert.equal(b.storyInput.generated?.spreads.length, 12);
    assert.equal(b.project.status, "hero_approved");

    // Úprava s menom v tvare sa uloží ako značka jazykového modulu.
    await m.story.editSpread(project.id, 0, "Ráno sa Janko hral s Jankom.");
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.storyInput.generated?.spreads[0].text, "Ráno sa {meno} hral s {meno:I}.");

    for (let i = 0; i < 5; i++) await m.story.rewriteSpread(project.id, 1, "kratšie");
    await assert.rejects(() => m.story.rewriteSpread(project.id, 1, "kratšie"), m.projects.ValidationError);

    await m.story.approveText(project.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "text_approved");
    assert.ok(b.storyInput.textApprovedAt);
  });

  it("vzhľad: najviac 4 aktivity, 16 dvojstrán vynúti 40 strán", async () => {
    const project = await projectWithStory();
    await assert.rejects(
      () => m.book.saveLook(project.id, { activities: ["trace_name", "count", "maze", "draw", "diploma"] }),
      m.projects.ValidationError
    );
    await m.story.saveStoryOptions(project.id, { spreadCount: 16 });
    await m.book.saveLook(project.id, { pageCount: 32, format: "A4", coloringBook: true });
    const b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.pageCount, 40);
    assert.equal(b.project.format, "A4");
    assert.equal(m.book.lookOf(b).coloringBook, true);
  });

  it("generovanie → náhľad → úpravy → schválenie uzamkne verziu", async () => {
    const { eq } = await import("drizzle-orm");
    const { loadBookVersion } = await import("@/features/book/server/versions");
    const spreadsOf = (bundle: typeof b) => bundle.pages.filter((p) => p.kind === "story_spread");
    const project = await projectWithStory();
    await m.book.startGeneration(project.id);
    let b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "generating");
    // Úplná kniha z renderera: obálka, titul, 12 dvojstrán, aktivity…, tiráž, zadná strana.
    assert.equal(spreadsOf(b).length, 12);
    assert.ok(b.pages.some((p) => p.kind === "title") && b.pages.some((p) => p.kind === "imprint"));
    assert.ok(spreadsOf(b).every((p) => p.status === "pending" && !p.illustrationKey));
    assert.match(spreadsOf(b)[1].text!, /Jankovi/);
    assert.match(spreadsOf(b)[1].text!, /dráčika|hračku/);

    await m.book.runGeneration(project.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "preview");
    assert.ok(spreadsOf(b).every((p) => p.status === "ready" && p.illustrationKey));
    // Ilustrácia je aj v modeli strany a prvá dvojstrana je na obálke.
    assert.ok(spreadsOf(b).every((p) => (p.data as { illustration?: { key: string } }).illustration?.key === p.illustrationKey));
    assert.equal(b.pages.find((p) => p.kind === "cover")?.illustrationKey, spreadsOf(b)[0].illustrationKey);
    const jobs = await m.db.db.select().from(m.db.schema.aiJobs).where(eq(m.db.schema.aiJobs.projectId, project.id));
    assert.equal(jobs.every((j) => j.status === "succeeded"), true);

    // Úprava textu sa prejaví aj v knihe renderera (náhľad, e-kniha, tlač).
    const page = spreadsOf(b)[0];
    await m.book.editPageText(project.id, page.id, "Nový text strany.");
    let book = (await loadBookVersion(b.book!.id))!;
    assert.ok(book.parts.some((part) => part.kind === "story_spread" && part.text === "Nový text strany."));
    await m.book.undoPage(project.id, page.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(spreadsOf(b)[0].text, page.text);
    assert.equal(spreadsOf(b)[0].editedByCustomer, false);
    book = (await loadBookVersion(b.book!.id))!;
    assert.equal(book.cover.scene?.key, spreadsOf(b)[0].illustrationKey);
    assert.ok(!book.parts.some((part) => part.kind === "story_spread" && part.text === "Nový text strany."));

    await m.book.savePersonalTexts(project.id, { dedication: "Pre Janka", back: "x".repeat(900) });
    await m.book.approveBook(project.id);
    b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "approved_by_customer");
    assert.ok(b.book?.lockedAt);
    assert.equal(b.personalTexts.back?.length, 400);
  });

  it("zmena mena po vygenerovaní vráti knihu pred generovanie, Karta ostáva", async () => {
    const project = await projectWithStory();
    await m.book.startGeneration(project.id);
    await m.book.runGeneration(project.id);
    // Nezmenený krok 1 knihu nechá tak.
    await m.projects.updateChild(project.id, child());
    assert.equal((await m.bundle.loadBundle(project.id))!.project.status, "preview");
    await m.projects.updateChild(project.id, child({ name: "Ján" }));
    const b = (await m.bundle.loadBundle(project.id))!;
    assert.equal(b.project.status, "text_approved");
    assert.equal(b.hero?.name, "Ján");
    assert.equal(m.bundle.currentCard(b, b.hero!.id, "watercolor")?.status, "approved");
  });
});
