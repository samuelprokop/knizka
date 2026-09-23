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

## Vlastníctvo

`app/src/server/ai/`, `app/src/server/jobs/`, `app/src/server/qa/`, `app/scripts/worker.ts`.

## Hotovo, keď

- Celá kniha sa „vygeneruje“ cez frontu s mockmi; výpadok adaptéra nestratí objednávku (N5).
- Pridanie reálneho poskytovateľa = jeden nový súbor adaptéra + premenná prostredia.
