# Personalizovaná detská kniha – pravidlá projektu

Webová platforma pre vydavateľstvo TAKTIK: rodič nahrá fotku dieťaťa, vyberie príbeh
a dostane personalizovanú knihu (e-kniha a tlač, trhy SK + CZ). Kompletné zadanie je
v `analyza/` – pred prácou si prečítaj časti, ktoré sa týkajú tvojho balíka:

- `02_Produktova_specifikacia.pdf` – čo sa stavia (požiadavky s ID: K1.1, I7, J4, S5…)
- `03_Navrh_pouzivatelskeho_procesu.pdf` – obrazovky, stavy, hraničné prípady
- `04_Slovnik_mikrotextov_SK_CZ.pdf` – už prevedený do `app/src/i18n/messages/*.json`

Zadania balíkov práce: `docs/work-packages/`.

## Stav rozhodnutí

- Identita: dočasne **TAKTIK** (farby a písmo v `app/src/app/globals.css`, logo `app/public/brand/`).
- AI: firma zaplatí neskôr, **prístupy zatiaľ nie sú** → všetko cez adaptéry `mock`.
- Platby: len **placeholdery** (karta, Apple Pay, Google Pay, bankové tlačidlo, dobierka).
  Pozor: špecifikácia (O4) dobierku pri personalizovanej knihe vypína – otvorené.
- Formát knihy: **A4 alebo A5**, vyberá zákazník.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · PostgreSQL 14 (lokálne cez Homebrew)
· Drizzle ORM · motion · zod. **Next.js 16 má zmeny oproti tréningovým dátam** – pred písaním
kódu čítaj `app/node_modules/next/dist/docs/` (napr. `middleware` je teraz `proxy.ts`).

## Spustenie

```bash
cd app
npm install
cp .env.example .env.local        # ak ešte neexistuje
npm run db:migrate && npm run db:seed
npm run dev                       # stránka + worker fronty úloh; http://localhost:3000 → /sk alebo /cz
```

`npm run dev` spúšťa Next.js aj worker (`scripts/dev.mjs`) – bez workera sa ilustrácie v kroku 7
negenerujú. Samotný Next.js: `npm run dev:next`, samotný worker: `npm run worker`.
Prístup do administrácie (`/admin`): `npm run admin:create-user -- --email … --name "…" --role admin`
(heslo sa vygeneruje a vypíše raz).

### Náhľad UI (katalóg obrazoviek)

```bash
cd app
npm run ui:setup   # oddelená DB knizka_ui + ukážkové projekty v každom stave (znova = nanovo)
npm run ui         # http://localhost:3100/ui – beží aj popri npm run dev
```

V náhľade (`UI_PREVIEW=1`, len mimo produkcie) sa nič neukladá, negeneruje ani neplatí: obaly akcií
vrátia `common.ui_preview`, administrácia je otvorená ako správca. Nová obrazovka alebo nový stav =
doplniť ukážku do `scripts/ui-preview/seed.ts` a odkaz do `src/app/ui/page.tsx`.

Kontroly pred odovzdaním: `npm run typecheck && npm run lint && npm test` (a pri zmene sadzby `npm run test:render`).

## Štruktúra (`app/src`)

| Kde | Čo |
|---|---|
| `app/[market]/` | stránky pre zákazníka; `[market]` = `sk` \| `cz` (koreňový parameter, `next/root-params`) |
| `app/admin/` | administrácia (balík E) – vlastný root layout, bez trhu |
| `proxy.ts` | presmerovanie `/` na trh podľa domény / jazyka |
| `config/markets.ts` | trhy: mena, ceny, DPH, platby, doprava – **trh je konfigurácia, nie vetva kódu** |
| `config/catalog.ts` | katalóg možností (štýly, layouty, aktivity, limity, predvolené podľa veku) |
| `domain/` | čistá doménová logika bez DB (cena, stavový automat projektu) |
| `db/schema.ts` | dátový model; `db/index.ts` = klient (len server) |
| `i18n/` | texty rozhrania: `getMarketContext()` na serveri, `useI18n()` v klientovi |
| `lib/language/` | jazykový modul: tvary mien, značky `{meno:D}` `{rod:bol\|bola}`, typografia |
| `server/ai/` | rozhrania ImageProvider / TextProvider + mock adaptéry |
| `server/storage/` | úložisko súborov (lokálne `.storage/`, mimo `public/`) |
| `server/payments/` | platby – placeholder |
| `server/jobs/`, `server/qa/` | fronta úloh (worker), kontrola strán a fotiek (balík B) |
| `features/checkout/`, `server/email/` | košík, pokladňa, objednávky, e-maily do konzoly (balík D) |
| `app/admin/`, `features/admin/` | administrácia: príbehy, slovník mien, fronty kontroly (balík E) |
| `features/configurator/` | konfigurátor, kroky 1 – 9 (balík A) – `/[market]/vytvorit`, `/[market]/kniha/[id]/[krok]` |
| `features/book/` | model knihy, layouty, náhľad, dizajn (témy, písma) – zdroj pravdy pre vzhľad (balík C) |
| `server/render/` | e-kniha a tlačové PDF cez Chrome (balík C) |
| `content/` | marketingové texty (úvodná stránka) |
| `components/BookHero.tsx` | hero s knihou – schválený, **nemeniť bez pokynu** |

## Pravidlá kódu

- **Jazyk:** komentáre a texty po slovensky, identifikátory po anglicky. Zákazník je vykaný.
- **Žiadne texty natvrdo v UI.** Všetko cez `t("kľúč")`; nový kľúč pridaj do `sk.json` **aj** `cs.json`
  (typ `MessageKey` to kontroluje). Premenné v textoch sú anglické: `{price}`, `{n}`, `{total}`.
- **Meno dieťaťa sa nikdy neskloňuje ručne** – len cez jazykový modul (`renderNameTokens`,
  `resolveName`). Texty používajú značky `{meno}`, `{meno:G|D|A|V|L|I}`, `{rod:mužský|ženský}`.
- **Peniaze** v najmenších jednotkách meny (`integer`), formátovanie `formatMoney()`.
- **Súkromie je požiadavka, nie doplnok:** fotky detí nikdy do `public/`, DB, logov, e-mailov ani
  analytiky; meno dieťaťa nikdy do analytiky ani obchodu (A2, O2). Každý súhlas sa ukladá do `consents`.
- **AI len cez `getImageProvider()` / `getTextProvider()`**, nikdy priamo SDK v komponente.
  Do textového modelu nejde fotka ani priezvisko (S13). Každé volanie logovať do `ai_jobs`.
- **Zmena schémy:** uprav `db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.
  Migrácie sa nemenia spätne. Pri konflikte s iným balíkom zlúč cez novú migráciu.
- **Stav projektu** meniť len cez `assertTransition()` z `domain/project-status.ts`.
- Mobil na prvom mieste (N1), prístupnosť WCAG 2.1 AA (N9).
- Git: každý balík vo vlastnej vetve `pkg/<písmeno>-<názov>`; commit len keď to používateľ povolí.
