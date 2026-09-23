# Slovník mien – zdroje a licencie

Súbory `sk.json` a `cs.json` generuje `npm run names:build` (skripty v `app/scripts/names/`),
do DB ich zapíše `npm run names:import` (volá ho aj `npm run db:seed`).
Každý záznam má pole `source` a pri prevzatých tvaroch aj `ref` (odkaz na konkrétnu revíziu hesla).
Všetky záznamy idú do DB s `verified = false`, kým ich neoverí korektor. Záznamy, ktoré korektor
už overil, import neprepíše.

| Zdroj | Čo z neho berieme | Licencia |
|---|---|---|
| [Wikipédia – Meniny na Slovensku](https://sk.wikipedia.org/wiki/Meniny_na_Slovensku) (podľa Oficiálneho kalendária MK SR) | zoznam mien, dátumy menín pre trh **sk** | CC BY-SA 4.0 |
| [Wikipedie – Jmeniny v Česku](https://cs.wikipedia.org/wiki/Jmeniny_v_%C4%8Cesku) (občanský kalendář) | zoznam mien, dátumy menín pre trh **cz** | CC BY-SA 4.0 |
| [Wikislovník cs](https://cs.wiktionary.org/) / [sk](https://sk.wiktionary.org/) | tvary (7 pádov), rod, domácke podoby | CC BY-SA 4.0 |
| [Wiktionary en](https://en.wiktionary.org/) – kategórie *Czech/Slovak given names*, šablóny `cs-ndecl` / `sk-ndecl` | ďalšie mená, tvary tam, kde domáci Wikislovník heslo nemá | CC BY-SA 4.0 |
| Redakcia projektu (`scripts/names/curated.ts`) | moderné mená novorodencov, domácke podoby, výnimky tvarov | vlastné dielo |

Poznámky k licencii:

- Samotné dátumy menín a zoznamy mien sú fakty. Tvary z Wikislovníka/Wiktionary sú prevzaté
  údaje pod **CC BY-SA 4.0**. Slovník (tieto JSON súbory a z nich naplnená tabuľka) preto
  šírime s uvedením zdroja a pod rovnakou licenciou. Aplikácie a knihy, ktoré z neho len
  čítajú tvar mena, touto licenciou dotknuté nie sú. Pred komerčným vydaním odporúčame
  potvrdenie právnikom.
- Moderné mená novorodencov sú zostavené ručne podľa verejných rebríčkov ŠÚ SR a ČSÚ.
  Použité sú len ako zoznam mien, bez čísel.

## Delenie slov (J7) – `src/lib/language/hyphenation/`

| Súbor | Autor | Licencia |
|---|---|---|
| `patterns-sk.ts` (hyph-sk.tex) | Jana Chlebíková, 1992 | MIT |
| `patterns-cs.ts` (hyph-cs.tex) | Pavel Ševeček, 1995 | **GPL-2.0-or-later** – smie bežať len na serveri |
