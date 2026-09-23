/*
  Ukážkové projekty pre náhľad UI – každý v inom stave konfigurátora a nákupu.
  Spúšťa ho `npm run ui:setup` nad DB knizka_ui (nikdy nad vývojovou DB).
  Idempotentné: pri opakovaní staré ukážky zmaže a vytvorí nanovo.

  Projekty sa hľadajú podľa e-mailu <slug>@ui.local – katalóg /ui podľa neho
  skladá odkazy. Beží bez UI_PREVIEW, aby zápisy fungovali.
*/

import { randomBytes, scryptSync } from "node:crypto";

import { eq, inArray, like } from "drizzle-orm";

import { STYLES } from "@/config/catalog";
import { MARKETS, type MarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { getDemoIllustrations } from "@/features/book/server/illustrations";
import * as book from "@/features/configurator/server/book";
import { loadBundle } from "@/features/configurator/server/bundle";
import * as characters from "@/features/configurator/server/characters";
import * as hero from "@/features/configurator/server/hero";
import * as projects from "@/features/configurator/server/projects";
import * as story from "@/features/configurator/server/story";
import { submitCheckout } from "@/features/checkout/server/checkout";
import { confirmPayment } from "@/features/checkout/server/orders";
import type { BookLanguage } from "@/i18n/locales";
import { runOnce, runPendingJobs } from "@/server/jobs";

if (!process.env.DATABASE_URL?.endsWith("/knizka_ui")) {
  throw new Error("Ukážky sa vytvárajú len v DB knizka_ui (npm run ui:setup).");
}

const photo = Buffer.alloc(4_000, 1);
const email = (slug: string) => `${slug}@ui.local`;

type Child = { name: string; gender: "girl" | "boy"; age: number; bookLanguage: BookLanguage };
const JANKO: Child = { name: "Janko", gender: "boy", age: 5, bookLanguage: "sk" };

async function create(slug: string, child: Child = JANKO, market: MarketCode = "sk") {
  const { project } = await projects.createProject({
    market: MARKETS[market],
    child: { ...child, occasion: "birthday", editedForms: null, indeclinable: false },
    email: email(slug),
    marketingConsent: false,
    userAgent: "ui-preview",
  });
  return project.id;
}

const heroOf = async (id: string) => (await loadBundle(id))!.hero!.id;

async function withPhotos(id: string) {
  const heroId = await heroOf(id);
  await hero.addPhoto({ projectId: id, characterId: heroId, data: photo, contentType: "image/jpeg", width: 1000, height: 1250 });
  await hero.addPhoto({ projectId: id, characterId: heroId, data: photo, contentType: "image/jpeg", width: 1000, height: 1250 });
  // Druhá fotka ako „použiteľná, ale…“ – verdikt s radou (krok 2).
  const photos = await db.select().from(schema.photos).where(eq(schema.photos.characterId, heroId));
  await db.update(schema.photos).set({ verdict: "ok", verdictReason: "light" }).where(eq(schema.photos.id, photos[1].id));
  return id;
}

async function withPortraits(id: string) {
  await withPhotos(id);
  await hero.finishAppearance(id, "photo");
  await hero.generateStylePortraits(id);
  await runPendingJobs();
  return id;
}

async function withCard(id: string) {
  await withPortraits(id);
  await hero.chooseStyle(id, "watercolor");
  await runPendingJobs();
  return id;
}

async function withHero(id: string) {
  await withCard(id);
  await hero.approveHeroCard(id);
  return id;
}

async function withStory(id: string) {
  await withHero(id);
  await characters.onlyHero(id);
  const language = (await loadBundle(id))!.project.bookLanguage as BookLanguage;
  const [item] = await story.listLibrary(language);
  await story.chooseLibraryStory(id, item.story.id, { toy: language === "sk" ? "dráčika" : "dráčka" });
  return id;
}

async function withBook(id: string) {
  await withStory(id);
  await book.startGeneration(id);
  await book.runGeneration(id);
  await runPendingJobs();
  return id;
}

async function main() {
  // ---------------------------------------------------------------- upratanie starých ukážok
  const old = await db.select({ id: schema.projects.id }).from(schema.projects).where(like(schema.projects.email, "%@ui.local"));
  if (old.length) {
    const ids = old.map((p) => p.id);
    await db.delete(schema.orders).where(inArray(schema.orders.projectId, ids));
    await db.delete(schema.projects).where(inArray(schema.projects.id, ids));
  }
  await db.delete(schema.adminUsers).where(like(schema.adminUsers.email, "%@ui.local"));

  // Ukážkové ilustrácie štýlov (krok 6, editor príbehov) – nech sa negenerujú pri zobrazení.
  for (const style of STYLES) await getDemoIllustrations(style);

  // ---------------------------------------------------------------- konfigurátor
  await create("krok-2");
  await withPhotos(await create("krok-2-fotky"));
  await withPortraits(await create("krok-3-styl"));
  await withCard(await create("krok-3-karta"));
  await withHero(await create("krok-4"));

  const companions = await withHero(await create("krok-4-postavy"));
  const sister = await characters.addCompanion(companions, {
    kind: "sibling",
    name: "Anička",
    gender: "girl",
    storyRole: "companion",
    appearance: { hairColor: "blond", hairLength: "long", eyes: "blue", skin: "light" },
    editedForms: null,
    indeclinable: false,
    withPhoto: false,
  });
  await characters.generateCompanionCard(companions, sister.id);
  await runPendingJobs();

  const library = await withHero(await create("krok-5"));
  await characters.onlyHero(library);

  const custom = await withHero(await create("krok-5-na-mieru"));
  await characters.onlyHero(custom);
  await story.requestIdeas(custom, { occasion: "birthday", worlds: ["forest"], tone: "adventurous", message: "courage" });

  const customText = await withHero(await create("krok-5-text"));
  await characters.onlyHero(customText);
  await story.requestIdeas(customText, { occasion: "birthday", worlds: ["space"], tone: "cheerful" });
  await story.writeFromIdea(customText, 0);

  await withStory(await create("krok-6"));

  const preview = await withBook(await create("krok-8"));
  const spread = (await loadBundle(preview))!.pages.find((p) => p.kind === "story_spread" && p.position > 2);
  if (spread) await book.editPageText(preview, spread.id, "Janko si do batôžka pribalil aj svojho dráčika. Bude sa mu hodiť!");

  await withBook(await create("cz-krok-8", { name: "Petr", gender: "boy", age: 6, bookLanguage: "cs" }, "cz"));

  // Meno mimo slovníka (jazyková kontrola) a nesklonné meno – krok 1 v úprave.
  await withHero(await create("meno-mimo-slovnika", { name: "Radoslavko", gender: "boy", age: 4, bookLanguage: "sk" }));
  await create("nesklonne-meno", { name: "Zoe", gender: "girl", age: 5, bookLanguage: "sk" });

  // ---------------------------------------------------------------- nákup
  const approved = await withBook(await create("schvalena"));
  await book.approveBook(approved);

  const paid = await withBook(await create("zaplatena"));
  await book.approveBook(paid);
  const paidBundle = (await loadBundle(paid))!;
  const { redirectUrl } = await submitCheckout(
    {
      projectId: paid,
      bookVersionId: paidBundle.book!.id,
      email: email("zaplatena"),
      variant: "print_ebook",
      extraCopies: 1,
      giftWrap: true,
      carrierId: "packeta",
      address: { name: "Ukážkový Rodič", street: "", city: "", zip: "", pickupPointLabel: "Packeta – Ukážková 1, Bratislava" },
      invoice: null,
      voucherCode: "",
      paymentMethod: "card",
      termsAccepted: true,
    },
    { origin: "http://localhost:3100", userAgent: "ui-preview" }
  );
  const url = new URL(redirectUrl, "http://localhost:3100");
  const orderId = url.pathname.split("/")[3];
  const payment = url.searchParams.get("payment");
  if (orderId && payment) await confirmPayment(orderId, payment);

  // Kniha v polovici generovania – až na koniec, lebo runPendingJobs vyššie by
  // dogeneroval aj jej strany (fronta je spoločná).
  const generating = await withStory(await create("krok-7"));
  await book.startGeneration(generating);
  await book.runGeneration(generating);
  for (let i = 0; i < 5; i++) await runOnce("ui-preview");

  // ---------------------------------------------------------------- administrácia
  // Používatelia len na zobrazenie zoznamu – heslá sú náhodné a nikde sa nevypíšu.
  const hash = () => {
    const salt = randomBytes(16).toString("hex");
    return { passwordSalt: salt, passwordHash: scryptSync(randomBytes(24), salt, 64).toString("hex") };
  };
  await db.insert(schema.adminUsers).values([
    { email: "redaktor@ui.local", name: "Ukážková Redaktorka", role: "content_editor", ...hash() },
    { email: "grafik@ui.local", name: "Ukážkový Grafik", role: "graphic", ...hash() },
  ]);

  const count = await db.select({ id: schema.projects.id }).from(schema.projects).where(like(schema.projects.email, "%@ui.local"));
  console.log(`Náhľad UI pripravený: ${count.length} ukážkových projektov.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
