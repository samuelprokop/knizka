/*
  Dátový model štúdia (aplikácie). Obchodné údaje (faktúry, účtovníctvo) sú
  v obchode značky; tu je len to, čo potrebuje tvorba a výroba knihy.

  Pravidlá:
  - Fotky detí sa nikdy neukladajú do DB, len kľúč do oddeleného úložiska
    s lehotou zmazania (photos.deleteAfter).
  - Peniaze v najmenších jednotkách meny (integer).
  - Zmeny schémy len cez `npm run db:generate` + `npm run db:migrate`.
*/

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------- enums

/** Stavy projektu podľa návrhu používateľského procesu (Stavy projektu knihy). */
export const projectStatus = pgEnum("project_status", [
  "draft",
  "hero_approved",
  "text_approved",
  "generating",
  "preview",
  "approved_by_customer",
  "paid",
  "in_review",
  "fixing",
  "awaiting_customer",
  "printing",
  "shipped",
  "delivered",
  "deleted",
]);

export const gender = pgEnum("gender", ["girl", "boy"]);
export const characterRole = pgEnum("character_role", ["hero", "companion", "guide"]);
export const appearanceSource = pgEnum("appearance_source", ["photo", "description"]);
export const storyPath = pgEnum("story_path", ["A", "B", "C", "D"]);
export const photoVerdict = pgEnum("photo_verdict", ["good", "ok", "bad", "rejected", "pending"]);
export const cardStatus = pgEnum("card_status", ["generating", "ready", "approved", "rejected", "failed"]);
export const pageStatus = pgEnum("page_status", ["pending", "generating", "ready", "needs_review", "failed"]);
export const aiJobStatus = pgEnum("ai_job_status", ["queued", "running", "succeeded", "failed"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "succeeded", "failed"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "cancelled",
  "refunded",
  "in_production",
  "shipped",
  "delivered",
]);
export const nameReviewStatus = pgEnum("name_review_status", ["pending", "approved", "rejected"]);
export const consentType = pgEnum("consent_type", [
  "guardian",
  "ai_processing",
  "photo_retention",
  "marketing",
  "other_person_photo",
  "save_hero",
  "terms",
]);

/** Roly interných používateľov (špecifikácia: Administrácia – Roly). */
export const adminRole = pgEnum("admin_role", [
  "content_editor", // Redaktor obsahu
  "graphic", // Grafik
  "support", // Podpora
  "production", // Výroba
  "market_admin", // Správca trhu
  "art_director", // Art director a produkčný grafik
  "admin", // Administrátor – všetko vrátane používateľov a auditu
]);

// ---------------------------------------------------------------- projekty

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market: text("market").notNull(),
    bookLanguage: text("book_language").notNull(),
    email: text("email"),
    /** SHA-256 jednorazového tokenu z e-mailového odkazu; samotný token sa neukladá. */
    accessTokenHash: text("access_token_hash"),
    /** Neuhádnuteľný token osobnej stránky knihy za QR kódom (balík D) – na rozdiel od `id` sa dá voľne zdieľať. */
    personalToken: text("personal_token")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()::text`),
    status: projectStatus("status").notNull().default("draft"),
    /** Posledný krok, na ktorom zákazník bol – návrat cez odkaz otvorí presne ten. */
    currentStep: integer("current_step").notNull().default(1),
    occasion: text("occasion"),

    storyPath: storyPath("story_path"),
    storyId: uuid("story_id").references(() => stories.id),
    styleId: text("style_id"),
    layoutId: text("layout_id"),
    format: text("format").notNull().default("A5"),
    binding: text("binding").notNull().default("hardcover"),
    pageCount: integer("page_count").notNull().default(32),
    /** Obálka, farebná téma, písmo, predsádky, rámiky, aktivity, sprievodca pre rodiča… */
    options: jsonb("options").$type<Record<string, unknown>>().notNull().default({}),
    /** Vlastné detaily (cesta B), odpovede sprievodcu (C), vlastný text (D). */
    storyInput: jsonb("story_input").$type<Record<string, unknown>>(),
    /** Venovanie, darca, list od rodiča, text zadnej strany. */
    personalTexts: jsonb("personal_texts").$type<Record<string, unknown>>(),
    needsLanguageReview: boolean("needs_language_review").notNull().default(false),

    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_email_idx").on(t.email), index("projects_status_idx").on(t.status)]
);

// ---------------------------------------------------------------- postavy

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    role: characterRole("role").notNull(),
    /** Pri spoločníkovi: súrodenec, mama, miláčik… (catalog CHARACTER_KINDS). */
    kind: text("kind"),
    /** Podoba mena, pod ktorou postava v knihe vystupuje (Janko, nie Ján). */
    name: text("name").notNull(),
    /** Tvary mena potvrdené zákazníkom: { N, G, D, A, V, L, I }. */
    nameForms: jsonb("name_forms").$type<Record<string, string>>(),
    nameIndeclinable: boolean("name_indeclinable").notNull().default(false),
    gender: gender("gender"),
    age: integer("age"),
    /** „hlavný spoločník“ alebo „objaví sa v príbehu“. */
    storyRole: text("story_role"),
    appearanceSource: appearanceSource("appearance_source"),
    /** Opis vzhľadu (vlasy, oči, pleť, okuliare, pomôcky, oblečenie, doplnok). */
    appearance: jsonb("appearance").$type<Record<string, unknown>>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("characters_project_idx").on(t.projectId)]
);

/** Fotky len ako odkaz do oddeleného úložiska; mažú sa do 24 h po schválení Karty, najneskôr po 7 dňoch. */
export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    storageKey: text("storage_key"),
    verdict: photoVerdict("verdict").notNull().default("pending"),
    verdictReason: text("verdict_reason"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    deleteAfter: timestamp("delete_after", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("photos_delete_after_idx").on(t.deleteAfter)]
);

/** Karta postavy: portrét, celá postava, 2 výrazy – referencia pre všetky strany. */
export const characterCards = pgTable(
  "character_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    styleId: text("style_id").notNull(),
    version: integer("version").notNull().default(1),
    status: cardStatus("status").notNull().default("generating"),
    /** Kľúče obrázkov v úložisku: portrait, fullBody, expressions[]. */
    images: jsonb("images").$type<Record<string, unknown>>(),
    regenerationReason: text("regeneration_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("character_cards_character_idx").on(t.characterId)]
);

// ---------------------------------------------------------------- knižnica príbehov

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  ageMin: integer("age_min").notNull(),
  ageMax: integer("age_max").notNull(),
  /** Počet dvojstrán príbehu (12 alebo 16). */
  spreads: integer("spreads").notNull().default(12),
  /** Štýly, v ktorých má príbeh pripravené scény. */
  styles: text("styles").array().notNull().default([]),
  /** Miesto pre ďalšie postavy v scénach (0–3). */
  companionSlots: integer("companion_slots").notNull().default(0),
  needsGuide: boolean("needs_guide").notNull().default(false),
  published: boolean("published").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Edícia = text príbehu v jednom jazyku (redakčná adaptácia, nie preklad). */
export const storyEditions = pgTable(
  "story_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    version: integer("version").notNull().default(1),
    title: text("title").notNull(),
    annotation: text("annotation").notNull(),
    developmentGoal: text("development_goal"),
    author: text("author"),
    /**
     * Dvojstrany: [{ text, fallbackText, scene }]. Text používa značky
     * jazykového modulu: {meno}, {meno:D}, {rod:bol|bola}.
     */
    spreads: jsonb("spreads").$type<StorySpread[]>().notNull(),
    /** Voľné miesta pre cestu B: hračka, jedlo, miesto… */
    detailSlots: text("detail_slots").array().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("story_editions_story_lang_ver_idx").on(t.storyId, t.language, t.version)]
);

export type StorySpread = {
  text: string;
  /** Záložná veta bez skloňovaného mena pre nesklonné mená (J5). */
  fallbackText?: string;
  /** Opis scény pre generátor ilustrácií (bez textu v obrázku). */
  scene?: string;
};

// ---------------------------------------------------------------- vygenerovaná kniha

/** Uzamknutá verzia knihy – z nej sa renderuje náhľad, e-kniha aj tlačové PDF. */
export const bookVersions = pgTable(
  "book_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Snímka všetkých volieb v čase generovania (štýl, layout, verzie edície…). */
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("book_versions_project_ver_idx").on(t.projectId, t.version)]
);

export const bookPages = pgTable(
  "book_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookVersionId: uuid("book_version_id")
      .notNull()
      .references(() => bookVersions.id, { onDelete: "cascade" }),
    /** Poradie v knihe (0 = obálka). */
    position: integer("position").notNull(),
    /** cover, title, dedication, story_spread, activity, parent_guide, imprint, back_cover… */
    kind: text("kind").notNull(),
    text: text("text"),
    /** Štruktúrovaný obsah strany (model knihy, balík C) – uzamknutý s verziou. */
    data: jsonb("data").$type<Record<string, unknown>>(),
    illustrationKey: text("illustration_key"),
    layoutId: text("layout_id"),
    status: pageStatus("status").notNull().default("pending"),
    qa: jsonb("qa").$type<Record<string, unknown>>(),
    attempts: integer("attempts").notNull().default(0),
    editedByCustomer: boolean("edited_by_customer").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [index("book_pages_version_idx").on(t.bookVersionId)]
);

// ---------------------------------------------------------------- súhlasy a audit

/** Súhlas sa ukladá s časom, zariadením a znením textu (S2). */
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "set null" }),
    type: consentType("type").notNull(),
    granted: boolean("granted").notNull(),
    /** Kľúč textu v slovníku + jazyk, v ktorom ho zákazník videl. */
    textKey: text("text_key").notNull(),
    language: text("language").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("consents_project_idx").on(t.projectId)]
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id"),
  reason: text("reason"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------- administrácia (interní používatelia)

/** Interný používateľ štúdia (balík E). Heslo nikdy v čitateľnej podobe – len scrypt hash + soľ. */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: adminRole("role").notNull(),
  active: boolean("active").notNull().default(true),
  /** Miesto pre TOTP tajomstvo, keď pribudne dvojfaktorové prihlásenie (fáza 2). */
  totpSecret: text("totp_secret"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Relácia prihlásenia – v DB kvôli okamžitému odvolaniu (odhlásenie, deaktivácia používateľa). */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    /** SHA-256 tokenu z cookie; samotný token sa neukladá (rovnaký vzor ako projects.accessTokenHash). */
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("admin_sessions_user_idx").on(t.userId)]
);

// ---------------------------------------------------------------- AI

/** Log každého volania AI (I2): model, verzia, parametre, prompt, pokus, chyba, cena. */
export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    params: jsonb("params").$type<Record<string, unknown>>(),
    prompt: text("prompt"),
    status: aiJobStatus("status").notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    error: text("error"),
    costMicroUsd: integer("cost_micro_usd"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("ai_jobs_project_idx").on(t.projectId), index("ai_jobs_status_idx").on(t.status)]
);

/**
 * Fronta úloh na pozadí (N3): ilustrácie, portréty, Karty postáv. Worker si
 * úlohu vyzdvihne cez `SELECT … FOR UPDATE SKIP LOCKED` podľa `runAt`, pri
 * chybe adaptéra ju vráti do fronty s odloženým `runAt` (výpadok nestratí
 * objednávku, N5). `relatedType`/`relatedId` ukazujú na riadok, ktorý úloha
 * dokončí (napr. book_pages/character_cards), aby sa dal dohľadať jej výsledok.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    relatedType: text("related_type"),
    relatedId: uuid("related_id"),
    error: text("error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("jobs_claim_idx").on(t.status, t.runAt), index("jobs_project_idx").on(t.projectId)]
);

// ---------------------------------------------------------------- jazykový modul

/** Slovník mien (J1): všetky tvary, rod, sklonnosť, overenie korektorom. */
export const nameDictionary = pgTable(
  "name_dictionary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    language: text("language").notNull(),
    name: text("name").notNull(),
    gender: gender("gender").notNull(),
    /** Pomenované tvary jazyka, napr. { N, G, D, A, V, L, I }. */
    forms: jsonb("forms").$type<Record<string, string>>().notNull(),
    declinable: boolean("declinable").notNull().default(true),
    /** Domácke podoby (Ján → Janko, Janík). */
    diminutives: text("diminutives").array().notNull().default([]),
    /** Základné meno, ak je toto domácka podoba. */
    baseName: text("base_name"),
    /**
     * Meniny podľa TRHU, nie jazyka (J8): { sk: "08-21", cz: "05-24" }.
     * Kľúč = kód trhu z config/markets.ts.
     */
    nameDays: jsonb("name_days").$type<Record<string, string>>().notNull().default({}),
    /** Pôvod tvarov: wiktionary | manual | rules | review (schválené z fronty jazykovej kontroly). */
    source: text("source").notNull().default("manual"),
    verified: boolean("verified").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // Rovnaké meno môže byť mužské aj ženské (Nikola, Saša, Míša) – každé má iné tvary.
  (t) => [uniqueIndex("name_dictionary_lang_name_gender_idx").on(t.language, t.name, t.gender)]
);

/**
 * Fronta jazykovej kontroly (J4): meno mimo slovníka alebo s neovereným záznamom.
 * Kniha nejde do tlače, kým úloha projektu nie je vybavená. Po schválení sa meno
 * zapíše do slovníka ako overené. UI robí administrácia (balík E).
 */
export const nameReviewTasks = pgTable(
  "name_review_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Úloha patrí projektu – so zmazaním projektu zaniká aj meno dieťaťa v nej. */
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    name: text("name").notNull(),
    gender: gender("gender").notNull(),
    /** Návrh pravidlami (J4). */
    proposedForms: jsonb("proposed_forms").$type<Record<string, string>>().notNull(),
    /** Tvary potvrdené alebo opravené zákazníkom (K1.3). */
    customerForms: jsonb("customer_forms").$type<Record<string, string>>(),
    declinable: boolean("declinable").notNull().default(true),
    status: nameReviewStatus("status").notNull().default("pending"),
    /** Tvary schválené korektorom – tie idú do slovníka aj do knihy. */
    approvedForms: jsonb("approved_forms").$type<Record<string, string>>(),
    approvedDeclinable: boolean("approved_declinable"),
    reviewer: text("reviewer"),
    note: text("note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("name_review_tasks_status_idx").on(t.status),
    index("name_review_tasks_project_idx").on(t.projectId),
    index("name_review_tasks_name_idx").on(t.language, t.name, t.gender),
  ]
);

// ---------------------------------------------------------------- objednávky

/** Objednávka – PLACEHOLDER: platby zatiaľ bez brány, stav sa nastavuje ručne/mockom. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    bookVersionId: uuid("book_version_id").references(() => bookVersions.id),
    market: text("market").notNull(),
    currency: text("currency").notNull(),
    /** "print_ebook" alebo "ebook". */
    variant: text("variant").notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentMethod: text("payment_method").notNull(),
    totalMinor: integer("total_minor").notNull(),
    /** Rozpis príplatkov v čase objednávky. */
    priceBreakdown: jsonb("price_breakdown").$type<Record<string, unknown>>().notNull(),
    /** Adresa alebo výdajné miesto – nikdy meno dieťaťa. */
    shipping: jsonb("shipping").$type<Record<string, unknown>>(),
    /** Id platby u poskytovateľa – kvôli idempotentnému spracovaniu notifikácie (O3). */
    externalPaymentId: text("external_payment_id").unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_project_idx").on(t.projectId)]
);
