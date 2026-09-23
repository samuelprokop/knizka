# B – AI pipeline (obrázky, texty, kontroly, fronta)

**Cieľ:** spoľahlivé generovanie Kariet postáv, scén a textov na pozadí, s automatickou kontrolou,
opakovaním a logovaním nákladov. Reálni poskytovatelia až keď firma dodá prístupy –
dovtedy všetko nad mock adaptérmi, pripravené na výmenu.

**Zdroj:** špecifikácia (02) Ilustračný pipeline (I1 – I15), Technický test (fáza 0), Príbeh na mieru
(čo pripravujú redaktori), S3, S10, S12 – S14, N3, N5; proces (03) Kroky 3, 5, 7.

## Rozsah

1. **Fronta úloh (N3):** úlohy v PostgreSQL (tabuľka + worker, napr. `SELECT … FOR UPDATE SKIP LOCKED`),
   opakovanie, pokračovanie od posledného úspešného kroku; worker ako samostatný proces (`npm run worker`).
2. **Orchestrácia:** portréty vo 4 štýloch (K3.1), Karta hrdinu (K3.2), Karty postáv, scény pre cestu A/B
   (vloženie hrdinu do pripravenej scény) a C/D (celá scéna), prepisy textu; stav stránok v `book_pages`.
3. **Kontroly (I7 – I9):** rozhranie automatickej kontroly strany (anatómia, zhoda s Kartou, počet postáv,
   text v obrázku) – zatiaľ mock; výsledok ok / pregenerovať 2× / označiť pre grafika.
4. **Verdikt fotky (K2.2):** do 3 s – ostrosť, jas, veľkosť a počet tvárí; bez biometrie (I10).
5. **Texty C/D:** prompty v SK a CZ podľa predlohy (dejové oblúky, pravidlá veku, zakázané témy),
   meno ako značka `{meno:X}` (J11); filter chránených postáv (S14).
6. **Log a náklady (I2):** každé volanie do `ai_jobs`; prehľad nákladu na náhľad a knihu.
7. **Výber poskytovateľa:** pripraviť porovnávací test (fáza 0) – skript, ktorý na sade testovacích
   hrdinov spustí adaptér a uloží výsledky; tabuľka kritérií S3 (EÚ, retencia, fotky maloletých).

## Napojenie na hotový kód (stav po vlne 1)

Dnes beží generovanie synchrónne v procese Next.js nad mockmi. Fronta ho má prevziať
bez zmeny UI konfigurátora:

| Čo | Kde je dnes | Čo s tým |
|---|---|---|
| Ilustrácie dvojstrán po jednej (krok 7) | `features/configurator/server/book.ts` → `runGeneration`, `renderPage`, `saveSpreadImage` | presunúť do úloh fronty; zápis výsledku nechať cez `saveSpreadImage` (píše aj `book_pages.data` a obálku) |
| Úprava ilustrácie s pokynom (krok 8) | `book.ts` → `editPageImage` + `finishPageImage` | úloha fronty |
| Portréty vo 4 štýloch, Karta hrdinu | `features/configurator/server/hero.ts` → `generateStylePortraits`, `generateCard` | úlohy fronty |
| Verdikt fotky | `features/configurator/server/photo-check.ts` → `PhotoChecker`, `getPhotoChecker()` (mock) | tvoja implementácia za rovnakým rozhraním |
| Log volaní | `features/configurator/server/ai-jobs.ts` → `withAiJob`, `features/book/server/illustrations.ts` → `generateScene` | zjednotiť do jedného miesta v `server/ai` |
| Stav strán | `book_pages.status`: pending → generating → ready / needs_review | zachovať – UI krokov 7 a 8 ho číta |

Konfigurátor (UI) nemeň; ak treba iné rozhranie, uprav len volania v `server/*.ts` konfigurátora.

## Vlastníctvo

`app/src/server/ai/`, `app/src/server/jobs/`, `app/src/server/qa/`, `app/scripts/worker.ts`.

## Hotovo, keď

- Celá kniha sa „vygeneruje“ cez frontu s mockmi; výpadok adaptéra nestratí objednávku (N5).
- Pridanie reálneho poskytovateľa = jeden nový súbor adaptéra + premenná prostredia.
