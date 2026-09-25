# Odovzdávka pre ďalšiu session / iný účet Claude Code

Tento dokument je pre session, ktorá pokračuje v projekte **bez histórie predchádzajúcej
konverzácie** (iný účet, iný počítač). Prečítaj ho celý spolu s `/CLAUDE.md` skôr, než začneš.
Stav k **25. 9. 2026** – odovzdávka začína commitom, ktorý pridal tento súbor (`git log -1 -- docs/handoff/README.md`).

---

## 1. Tvoja rola a kompetencie

- Si **vývojár a zároveň riaditeľ projektu**: navrhuješ postup, implementuješ, overuješ a commituješ.
  Používateľ (Samuel) má málo času – chce najlepší pomer rýchlosť / kvalita, rozhoduje o biznise.
- **Komunikácia po slovensky**, stručne, bez zbytočných otázok. Pýtaj sa len na rozhodnutia,
  ktoré patria používateľovi (ceny, právne veci, značka, výdavky).
- **Smieš:** meniť kód v celom `app/`, pridávať migrácie, texty, testy, skilly v `.claude/skills`;
  commitovať po každom hotovom kuse práce (používateľ to povolil).
- **Nesmieš bez výslovného súhlasu:** pushovať, mazať vetvy, míňať kredity platených služieb
  (Higgsfield a pod. – kredity sú takmer minuté), sťahovať súbory z internetu, prihlasovať sa
  v prehliadači, kupovať / odomykať platený kód (Motion+, 21st.dev PRO – reimplementuj podľa vizuálu).
- Keď skončíš (alebo dôjde čas), **napíš report** – pozri časť 8. Report je povinný, podľa neho
  pôvodný účet prevezme prácu späť.

## 2. Čo sa stavia

Webová platforma vydavateľstva **TAKTIK**: rodič zadá dieťa (meno, vek, pohlavie), nahrá fotku,
vyberie štýl ilustrácie a príbeh, pozrie si **celý náhľad knihy zadarmo** a zaplatí až keď sa mu
páči. Výstup: e-kniha (PDF hneď) a tlačená kniha (A4/A5, do 5 prac. dní). Trhy **SK (EUR)** a
**CZ (CZK)** – trh je konfigurácia (`app/src/config/markets.ts`), nie vetva kódu.

Zadanie: `analyza/02_Produktova_specifikacia.pdf` (požiadavky s ID K1.1, A3, O6…),
`03_Navrh_pouzivatelskeho_procesu.pdf` (obrazovky a stavy), `04_Slovnik_mikrotextov` (už v
`app/src/i18n/messages/*.json`). PDF čítaj cez `pdftotext -layout súbor.pdf - | grep …`.
Marketingový kontext: `.agents/product-marketing.md`.

## 3. Rozhodnutia, ktoré platia (nemeniť bez používateľa)

- **Značka:** dočasne TAKTIK (#FF661A oranžová, #00A5A0, #5E3F61, tmavá #17140f; Bitter + Inter).
  Tokeny len v `app/src/app/globals.css`.
- **AI:** firma zaplatí neskôr, prístupy nie sú → všetko cez adaptéry `mock`
  (`getImageProvider()` / `getTextProvider()`), každé volanie do `ai_jobs`.
- **Platby:** len placeholdery (karta, Apple Pay, Google Pay, banka, dobierka). Žiadne údaje karty na serveri.
- **Formát knihy:** A4 alebo A5 volí zákazník; orientáciu A5 nechal používateľ zámerne otvorenú.
- **Recenzie na webe sú ukážkové** (`content/reviews.ts`), v produkcii skryté – nikdy ich nevydávaj za skutočné.
- **Obchodné podmienky** (`content/terms.ts`) sú pracovný návrh pre právnika.
- `components/BookHero.tsx` (hero s knihou) – schválený, **nemeniť bez pokynu**.

## 4. Pravidlá práce (z doterajšej spolupráce)

**Kód** – podrobne v `/CLAUDE.md`, najdôležitejšie:
- Žiadne texty natvrdo: `t("kľúč")`, kľúč v `sk.json` **aj** `cs.json`; množné číslo cez `i18n/plural.ts`.
- Meno dieťaťa sa **nikdy neskloňuje ručne** – len značky `{meno:A}` a jazykový modul.
- Fotky detí nikdy do `public/`, DB, logov, e-mailov ani analytiky. Každý súhlas do `consents`
  (pri zmene znenia súhlasu **nový kľúč**, starý nechať – záznamy odkazujú na text).
- Stav projektu len cez `assertTransition()`. Schéma: `schema.ts` → `db:generate` → `db:migrate`, migrácie sa nemenia spätne.
- Next.js 16 sa líši od tréningových dát – čítaj `app/node_modules/next/dist/docs/` (napr. `proxy.ts`).

**UI / UX** (zákaznícka časť):
- Každý krok konfigurátora, košík a pokladňa sa **zmestia na jednu obrazovku bez posúvania** –
  overuj pri 1280×800, 1440×900, 1440×780, košík a pokladňu aj pri 1280×720.
- Čo by stránku predĺžilo, ide na podstránku / pod-krok (v hornej lište sa zobrazí ako ďalší krok).
- **Jedna hlavná výzva** na obrazovke. Mobil na prvom mieste, WCAG 2.1 AA, `prefers-reduced-motion`.
- **Žiadna falošná naliehavosť**, odpočítavanie ani vymyslené recenzie.
- Animácie: tokeny v `app/src/lib/motion.ts` (EASE, SPRING, EXIT, stagger), knižnica `motion`.
- Nová obrazovka alebo stav = ukážka v `app/scripts/ui-preview/seed.ts` + odkaz v `app/src/app/ui/page.tsx`.

**Overovanie:** po zmene viditeľnej v prehliadači ju over (Browser pane alebo puppeteer skript
s `puppeteer-core` a systémovým Chrome), zmeraj pretečenie `scrollHeight - innerHeight`, pozri
screenshot. Používateľovi sa nehovorí „skontrolujte si to“ – overíš sám a ukážeš výsledok.
Pred commitom: `npm run typecheck && npm run lint && npm test` (pri zmene sadzby aj `npm run test:render`).

## 5. Spustenie na novom počítači

Potrebné: Node 22, PostgreSQL 14 (Homebrew), Google Chrome (PDF renderer).

```bash
cd app
npm install
cp .env.example .env.local     # doplň SESSION_SECRET a MEDIA_URL_SECRET (aspoň 32 znakov)
createdb knizka_dev
npm run db:migrate && npm run db:seed
npm run dev                    # web + worker fronty úloh → http://localhost:3000
npm run ui:setup && npm run ui # katalóg obrazoviek → http://localhost:3100/ui (nič neukladá)
npm run admin:create-user -- --email … --name "…" --role admin   # prístup do /admin
```

V gite **nie sú** (zámerne, veľké súbory): `blender/renders/`, `hero videos/`, `brand manual/*.pdf`,
lokálne úložisko `.storage/` (fotky, ilustrácie – vzniknú znova zo seedu). Aplikácia ich nepotrebuje.

## 6. Skilly (`.claude/skills/` – načítajú sa automaticky v tomto priečinku)

| Na čo | Skilly |
|---|---|
| UI, layout, prístupnosť, animácie | `ui-ux-pro-max` (hlavný; má vyhľadávací skript), `design`, `design-system`, `frontend-design`, `impeccable`, `minimalist-ui`, `high-end-visual-design`, `redesign-existing-projects`, `ui-styling` |
| Pohyb | `remotion-motion-graphics` (len zásady pohybu – časovanie, easing), tokeny v `lib/motion.ts` |
| Marketing a konverzia | `marketing-psychology`, `paywalls` (náhľad zadarmo → platba, upsell), `popups` |
| SEO a obsah | `seo-audit`, `schema` (JSON-LD), `content-strategy`, `programmatic-seo` |
| Značka, grafika | `brand`, `brandkit`, `banner-design`, `slides` |
| Z obrázka do kódu | `image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile` |
| Hľadanie ďalších skillov | `find-skills` (nový skill sťahuj len so súhlasom) |

Pri UI práci vždy použi `ui-ux-pro-max`, pri čomkoľvek, čo ovplyvní nákup alebo návrat
zákazníka, `marketing-psychology` (+ `paywalls` / `popups`).

## 7. Stav projektu

**Hotové** (balíky v `docs/work-packages/`, všetky zlúčené do `main`):
- A konfigurátor (kroky 1 – 9), C renderer (náhľad, e-kniha, tlačové PDF), J jazykový modul
  (SK 1 865 / CZ 1 063 mien), B AI pipeline nad mockom + fronta úloh a worker, D košík, pokladňa,
  objednávky, e-maily (do konzoly), E administrácia – prvá verzia.
- **Redizajn celej zákazníckej časti** (úvod so scroll-hero knihou, recenzie, FAQ, konfigurátor,
  košík, pokladňa, poďakovanie, stav objednávky, osobná stránka knihy `/moja-kniha`, podmienky, otázky).
- **Marketingový prechod** (commit `950ac5f`): doprava zadarmo a orientačný dátum doručenia v košíku
  (`domain/delivery.ts`), pripomienka rozpracovanej knihy na úvode (`ResumeNudge`), ponuka ďalšieho
  výtlačku po nákupe, naplánované e-maily (`server/jobs/lifecycle.ts` – len s marketingovým súhlasom).

**Otvorené rozhodnutia používateľa** (nerozhoduj sám, len navrhni):
- Cena ďalšieho výtlačku z osobnej stránky (dnes plná cena 32,90 €, v prvej objednávke 24,90 €).
- Uloženie hrdinu pre ďalšie knihy (súhlas `save_hero` v DB je, funkcia v konfigurátore nie).
- Vstupné SEO stránky podľa príležitosti (škôlka, prvák, meniny) – špecifikácia „SEO a obsah“.
- Zamknutie osobnej stránky kódom (7.3), dobierka pri personalizovanej knihe (O4).

**Známe medzery:** balík F (súkromie) nezačatý; B bez promptov C/D a prehľadu nákladov; D a E bez
vlastných testov; e-maily bez poskytovateľa; prechod `printing → shipped → delivered` v kóde chýba.

## 8. Ďalšia práca: administrácia (návrh, nie strop)

Existuje (`app/src/app/admin/`, `features/admin/`): prihlásenie a roly, knižnica príbehov s editorom
edícií, slovník mien + jazyková fronta, fronta grafika, používatelia, trh (len čítanie), audit.
Zadanie: `docs/work-packages/E-administracia.md` + špecifikácia kap. „Administrácia“ (moduly a roly).

Navrhované poradie podľa prínosu (rob koľko stihneš, po každom module commit):
1. **Výroba** – výrobné dávky, stavy tlače a expedovania (`printing → shipped → delivered` cez
   `assertTransition`), výrobný zoznam, hromadné stiahnutie tlačových PDF (`pdf/<order>-print-*.pdf`).
   Tým ožije aj stav „odoslané“ na stránke objednávky a e-mail so žiadosťou o recenziu.
2. **Servisné prípady** – reklamácie zo stránky objednávky (`features/checkout/server/complaints.ts`)
   do admin zoznamu a detailu; bezpečný odkaz na novú fotku, dotlač.
3. **Poukážky a kredity** – prehľad vydaných a uplatnených kódov, ručné vydanie podporou
   (dnes sú kódy v `features/checkout/voucher.ts` → presun do DB cez migráciu).
4. **Nastavenia trhu a procesu do DB** – ceny, limity, termíny, kapacitné stropy; zmena s auditom.
5. **Monitoring AI** – z tabuľky `ai_jobs`: úspešnosť, opakovania, cena a čas na knihu.
6. **Fronta redaktora** (príbehy na mieru pred tlačou) a testy pre D a E.

Pri admine: funkcia a prehľadnosť pred efektmi, drž sa `features/admin/components/ui.tsx`,
roly a prístup k fotkám podľa tabuľky „Roly“ v špecifikácii, každá citlivá akcia do `audit_log`,
nové texty s prefixom `admin.*`. Nové obrazovky pridaj do katalógu `/ui`.

## 9. Ako pracovať a odovzdať späť

1. Začni vo vetve `ucet2/<téma>` (napr. `ucet2/admin-vyroba`) vytvorenej z `main`.
2. Na začiatku napíš používateľovi plán v bodoch, potom postupuj bez čakania.
3. Commit po každom hotovom kuse (správa po slovensky, čo a prečo).
4. Na konci vyplň report podľa `docs/handoff/REPORT_TEMPLATE.md` do
   `docs/handoff/reports/<RRRR-MM-DD>-<téma>.md`, commitni ho a povedz používateľovi, nech vetvu
   pushne (alebo ju pushni so súhlasom).
