# Balíky práce

Každý balík beží v samostatnej session Claude Code otvorenej v priečinku `knizka/`.
Spoločné pravidlá sú v `/CLAUDE.md` – každá session ich načíta automaticky.

## Poradie

| Vlna | Balík | Závisí od | Stav |
|---|---|---|---|
| 0 | Základ (DB, trhy, i18n, jazykový modul v1, rozhrania AI/úložisko/platby) | – | hotové |
| 1 | [A – Konfigurátor](A-konfigurator.md) | základ | pripravené |
| 1 | [J – Jazykový modul](J-jazykovy-modul.md) | základ | pripravené |
| 1 | [C – Renderer knihy](C-renderer.md) | základ | pripravené |
| 2 | [B – AI pipeline](B-ai-pipeline.md) | základ; reálne AI až s prístupmi | pripravené (s mockmi) |
| 2 | [D – Košík a objednávky](D-objednavky.md) | A (krok 9), C (e-kniha) | čaká na A |
| 2 | [E – Administrácia](E-administracia.md) | základ | pripravené |
| 3 | [F – Súkromie a súhlasy](F-sukromie.md) | A, B | čaká |

Vlna 1 môže bežať naraz – balíky majú oddelené priečinky (pozri „Vlastníctvo“ v každom zadaní).

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
