# A – Konfigurátor (kroky 1 – 9)

**Cieľ:** zákazník na mobile prejde od mena po schválený náhľad; úroveň „Rýchlo“ do 10 minút.
Všetko s mock AI – po dodaní prístupov sa vymení len adaptér.

**Zdroj:** proces (03) kapitoly Krok 1 – Krok 9, Prehľad obrazoviek, Chybové stavy;
špecifikácia (02) K1.x – K9.x; texty v `i18n/messages` (kľúče `child.*`, `photo.*`, `style.*`,
`hero.*`, `chars.*`, `guide.*`, `story.*`, `details.*`, `wizard.*`, `own.*`, `text.*`, `layout.*`,
`cover.*`, `activities.*`, `gen.*`, `preview.*`, `editor.*`, `dedication.*`, `approve.*`).

## Rozsah

1. **Projekt a návrat:** založenie projektu po kroku 1, e-mail pri prechode do kroku 2
   (dialóg `common.email_dialog.*`), jednorazový odkaz s tokenom (hash v `projects.accessTokenHash`),
   návrat presne na posledný krok; lišta priebehu so skokom späť; lišta s cenou (`computePrice`).
2. **Krok 1 Dieťa:** meno + čipy domáckych podôb, rod, vek, jazyk knihy; živé vzorové vety
   cez `resolveName` + `renderNameTokens`; úprava tvarov, nesklonné meno, validácie (2 – 12 znakov).
   Meno mimo slovníka → `projects.needsLanguageReview = true`.
3. **Krok 2 Fotka/opis:** 3 samostatné súhlasy (uložiť do `consents`), nahratie 1 – 3 fotiek
   (kamera/galéria, JPG/PNG/HEIC, orez, otočenie) do `storage` pod `photos/`, `photos.deleteAfter`
   = +7 dní; verdikt zatiaľ mock (rozhranie pripraviť pre B); cesta „opíšem dieťa“.
4. **Krok 3 Štýl a Karta:** mriežka 2×2 portrétov (mock), výber štýlu, Karta hrdinu, úpravy vzhľadu,
   3 pregenerovania s dôvodom, schválenie → stav `hero_approved`.
5. **Krok 4 Postavy:** „Nie, len {meno}“ / pridať až 3 postavy (typ, meno cez jazykový modul,
   fotka alebo opis, rola), sprievodca (maskot / zvieratko / bez).
6. **Krok 5 Príbeh:** knižnica z DB (`stories` + `story_editions`), filtre, detail, cesta B (detaily),
   cesta C (otázky → 3 námety → text, mock), cesta D (vlastný text), úprava/prepísanie dvojstrany.
7. **Krok 6 Vzhľad:** layout, obálka, téma, písmo, predsádky, aktivity (4 zo 7), formát **A4/A5**,
   32/40 strán, omaľovánka. Ukážková dvojstrana – použi komponent z balíka C, ak je hotový,
   inak jednoduchý zástupný náhľad.
8. **Krok 7 – 8:** stav generovania po dvojstranách (mock), listovací náhľad s vodoznakom,
   editor strany v rozsahu textových úprav (ilustrácie s pokynom len ako UI nad mockom).
9. **Krok 9:** venovanie, list od rodiča, zadná strana, kontrolný zoznam, potvrdenie 3 viet →
   stav `approved_by_customer` a odovzdanie do košíka (balík D – zatiaľ len odkaz).

## Vlastníctvo

`app/src/app/[market]/vytvorit/`, `app/src/app/[market]/kniha/`, `app/src/features/configurator/`,
server actions v `app/src/features/configurator/actions/`.

## Mimo rozsahu

Skutočné AI (B), PDF a sadzba (C), košík a platba (D), mazanie fotiek plánovačom (F).

## Hotovo, keď

- Celá cesta Rýchlo prejde na mobile (375 px) v SK aj CZ bez textu natvrdo.
- Návrat cez odkaz obnoví projekt na inom zariadení.
- Zmena skoršieho kroku zobrazí `common.change_earlier_step` a zachová, čo sa meniť nemusí.
- `npm run typecheck && npm run lint && npm test` prejde; kľúčové server actions majú testy.
