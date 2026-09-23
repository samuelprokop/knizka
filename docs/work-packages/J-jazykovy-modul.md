# J – Jazykový modul (SK + CZ)

**Cieľ:** meno dieťaťa a spoločníkov je v celej knihe v správnom tvare, vrátane českého vokatívu;
nesklonné mená použijú záložné vety; texty majú správnu typografiu.

**Zdroj:** špecifikácia (02) kapitola Jazykový modul (J1 – J15), Pravidlá pre redaktorov,
akceptačné kritériá („100 mien zo slovenského a 100 z českého slovníka…“).

**Východisko:** `app/src/lib/language/` – typy, pravidlá v1 (`rules.ts`), dosadenie značiek
(`render.ts`), vyhľadanie v slovníku (`resolve.ts`), 41 vzorových mien (`seed-names.ts`), testy.

## Rozsah

1. **Slovník (J1):** zostaviť ~1 500 najčastejších krstných mien a domáckych podôb pre SK aj CZ
   (zdroje: štatistiky mien, kalendáre menín) so všetkými 7 tvarmi, rodom, sklonnosťou a
   domáckymi podobami; import skriptom do `name_dictionary` (`verified = false`, kým ich neprejde korektor).
   Pozor na licenciu zdrojov – uveď ich.
2. **Pravidlá (J4):** spresniť `rules.ts` (vkladné e, mäkké/tvrdé kmene, cudzie mená, dvojité mená
   „Anna Mária“); cieľ: pravidlá trafia ≥ 95 % slovníka – test porovná pravidlá so slovníkom.
3. **Meniny (J8):** dátumy menín podľa trhu (SK a CZ kalendár sa líšia) – pripraviť dáta a stĺpec.
4. **Kontroly (J5, J11, J13):** validátor šablóny edície – každá veta so skloňovaným menom má
   záložnú vetu; test sadzby každej vety s najkratším a najdlhším menom (2 a 12 znakov).
5. **Fronta jazykovej kontroly:** stav mena mimo slovníka → úloha pre redaktora; po schválení sa
   meno pridá do slovníka (UI robí E, tu dátový model + funkcie).
6. **Typografia (J7):** doplniť delenie slov a ďalšie pravidlá pre sadzbu (spolupráca s C).
7. **Moderácia mien (S9):** zoznam vulgarizmov a zakázaných mien pre SK aj CZ.

## Vlastníctvo

`app/src/lib/language/`, `app/scripts/names/`, dátové súbory slovníka (`app/data/names/`).

## Hotovo, keď

- 100 náhodných mien z každého slovníka v oboch rodoch prejde testom tvarov vrátane vokatívu.
- Vzorový príbeh (`npm run db:seed`) sa vysadí správne s Janko, Katka, Noah (SK) a Petr, Anička, Zoe (CZ).
- Verejné rozhranie modulu (`index.ts`, `resolve.ts`) zostáva spätne kompatibilné.
