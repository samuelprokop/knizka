# Renderer knihy (balík C)

Jedna uzamknutá verzia knihy → náhľad, e-kniha aj tlačové PDF z **tých istých React
komponentov** (`components/BookPage.tsx`), takže sa nemôžu líšiť.

## Tok

```
projekt v DB ──createBookVersion()──► Book (model strán) ──► book_versions + book_pages
                                           │
                 ┌─────────────────────────┼──────────────────────────────┐
     withSignedImages() + <BookFlipbook>   │            renderBookPdfInWorker(book, druh)
     (náhľad s vodoznakom, krok 7 – 8)     │            (e-kniha, tlač – vnútro, tlač – obálka)
                              <SampleSpread> (krok 6)
```

## Pre balík A (konfigurátor)

| Čo | Kde |
|---|---|
| Ukážková dvojstrana (krok 6) | `<SampleSpread data layout format theme fontPair? frames? watermark? />` z `components/SampleSpread` |
| Dáta ukážky (server) | `getSampleSpreadData({ market, language, name, spread, style, scenes? })` z `server/sample` |
| Zmestí sa text do layoutu? | `sampleTextFits(data, layout, format)`, `textFits(text, layout, format)`, `maxSpreadChars()` |
| Predvolené voľby kroku 6 | `defaultBookOptions({ age, style, format?, pageCount?, layout? })` z `model/options` |
| Názvy volieb pre UI | i18n `book.theme.*`, `book.font.*`, `book.endpaper.*`, `book.cover.*`, `book.title_position.*`, `book.format.*` |
| „Vygenerovať knihu“ | `createBookVersion(projectId)` z `server/versions` → `{ versionId, book }` (stav projektu mení volajúci cez `assertTransition`) |
| Listovací náhľad (krok 8) | `<BookFlipbook book={withSignedImages(await loadBookVersion(id), market)} onEditPage={…} />` |

Kontrakt dát projektu, ktoré číta `createBookVersion`, je v hlavičke `server/versions.ts`
(`projects.options`, `projects.personalTexts`, `projects.storyInput.story` pri cestách C/D).

## Pre balík D (objednávky)

- E-kniha po platbe: `renderBookPdfInWorker(book, "ebook")` z `@/server/render` – RGB, bez značiek,
  číslo objednávky v tiráži (`meta.orderRef`), AI označenie v XMP (S7).
- Tlač: `"print-interior"` + `"print-cover"` – spadávka 3 mm, orezové značky, TrimBox/BleedBox,
  obálka s chrbtom podľa rozsahu a väzby.
- QR v tiráži vedie na `personalPageUrl()` v `server/versions.ts` → `/[market]/moja-kniha/[projects.personalToken]`,
  neuhádnuteľný token nezávislý od `projects.id` (balík D).

## Vývoj

- Demo: `http://localhost:3003/sk/nahlad?meno=Konštantínko&rod=boy&layout=panoramic&format=A4&strany=40`
  (všetky voľby v URL; `?verzia=<id>` zobrazí uloženú verziu; tlačidlá na stiahnutie PDF).
- `npm test` – model strán, aktivity, limity znakov (bez prehliadača).
- `npm run test:render` – sadzba v Chrome: všetky layouty × A4/A5 × 32/40 × meno 2 a 12 znakov × SK/CZ
  bez pretečenia, limity znakov platia, náhľad = PDF.
- `npx tsx scripts/calibrate-layouts.ts` – zmeria kapacitu layoutov po zmene písma či rozmerov.

## Súbory

| Kde | Čo |
|---|---|
| `design.ts` | formáty, tlačové parametre, chrbát, témy, páry písiem, predsádky, layouty a limity |
| `model/` | `buildBook` (čistá funkcia), strany a dvojstrany, limity, texty cez jazykový modul |
| `activities/` | generátory: hľadanie písmen, počítanie, bludisko (deterministické podľa projektu) |
| `components/` | `BookPage`, `BookSpread`, `SampleSpread`, `BookFlipbook` |
| `styles/` | `book.css` (sadzba v jednotkách strany `--mm`), `fonts.css` |
| `server/` | podpísané URL obrázkov, mock ilustrácie s logom `ai_jobs`, verzie v DB, demo |
| `../../server/render/` | HTML pre PDF, Chrome + pdf-lib, render worker |
