# Balíky práce

Každý balík beží v samostatnej session Claude Code otvorenej v priečinku `knizka/`.
Spoločné pravidlá sú v `/CLAUDE.md` – každá session ich načíta automaticky.

## Poradie

| Vlna | Balík | Závisí od | Stav |
|---|---|---|---|
| 0 | Základ (DB, trhy, i18n, jazykový modul v1, rozhrania AI/úložisko/platby) | – | hotové |
| 1 | [A – Konfigurátor](A-konfigurator.md) | základ | hotové, zlúčené a prepojené s C |
| 1 | [J – Jazykový modul](J-jazykovy-modul.md) | základ | hotové, zlúčené (CZ slovník 1 063 mien – doplniť) |
| 1 | [C – Renderer knihy](C-renderer.md) | základ | hotové, zlúčené |
| 2 | [B – AI pipeline](B-ai-pipeline.md) | základ; reálne AI až s prístupmi | pripravené (s mockmi) |
| 2 | [D – Košík a objednávky](D-objednavky.md) | A (krok 9), C (e-kniha) | pripravené |
| 2 | [E – Administrácia](E-administracia.md) | základ | pripravené |
| 3 | [F – Súkromie a súhlasy](F-sukromie.md) | A, B | čaká na B |

Vlna 1 môže bežať naraz – balíky majú oddelené priečinky (pozri „Vlastníctvo“ v každom zadaní).

## Ako do seba zapadá konfigurátor (A) a renderer (C)

- Voľby vzhľadu sú identifikátory z `features/book/design.ts`; konfigurátor ich ukladá do
  `projects.options.look`, renderer ich číta v `features/book/server/versions.ts` (kontrakt v hlavičke).
- „Vygenerovať knihu“ volá `createBookVersion(id, { illustrations: "later" })` – model strán z C,
  dvojstrany čakajú na ilustrácie; konfigurátor ich generuje po jednej (`runGeneration`).
- Každá zmena dvojstrany (text, obrázok, vrátenie) ide aj do `book_pages.data` cez `withSpreadChanges`,
  takže náhľad, e-kniha aj tlač vidia to isté. Krok 8 je `BookFlipbook` z C.

## Ako spustiť balík

Otvor novú session v `knizka/` a vlož:

```
Si vývojár balíka <X> projektu v tomto priečinku. Prečítaj CLAUDE.md a
docs/work-packages/<súbor>.md a pracuj podľa zadania. Pracuj vo vetve
pkg/<x>-<názov>. Pred prácou mi v bodoch zhrň plán, potom postupuj.
Commituj len keď to povolím.
```

## Pravidlá medzi balíkmi

- Súbory mimo vlastníctva balíka meň len minimálne a v odovzdávke to uveď.
- Zmena spoločnej schémy DB = nová migrácia, nikdy úprava existujúcej.
- Nové texty rozhrania: vlastný prefix kľúča (napr. `admin.*` pre E), v `sk.json` aj `cs.json`.
- Odovzdávka: zhrnutie čo je hotové, čo nie, ako to overiť, zoznam otvorených otázok.
