# D – Košík, platby (placeholder) a stav objednávky

**Cieľ:** schválená kniha sa dá objednať a „zaplatiť“ – zatiaľ bez skutočnej brány; po platbe
e-kniha ihneď a stránka stavu objednávky.

**Zdroj:** špecifikácia (02) Obchod (O1 – O11), Výstupy (osobná stránka knihy), V4 – V6;
proces (03) Krok 10, Po platbe, Vedľajšie toky; texty `cart.*`, `thanks.*`, `status.*`, `email.*`,
`voucher.*`, `complaint.*`.

**Rozhodnutie zadávateľa:** platby len ako placeholdery – karta, Apple Pay, Google Pay, bankové
tlačidlo, dobierka. Špecifikácia (O4) dobierku pri personalizovanej knihe vypína – nechaj ju
zapnutú, ale za konfiguračným prepínačom trhu, a uveď to v odovzdávke.
Shopify vs. vlastná pokladnica nie je rozhodnuté – drž rozhranie `server/payments` tak, aby šlo oboje.

## Rozsah

1. Košík: položka s miniatúrou obálky a rozpisom príplatkov (`computePrice`), variant tlač + e-kniha /
   e-kniha, formát A4/A5, doplnky (ďalší výtlačok, balenie), zľavový kód / poukážka (UI + validácia mock).
2. Pokladnica: kontakt, doprava (dopravcovia z `config/markets`), výdajné miesto (zástupný výber),
   faktúra na firmu, výber platby → `server/payments` placeholder.
3. Objednávka v `orders`, idempotentné potvrdenie platby (O3), prechod projektu `paid` → `in_review`.
4. Stránka „Ďakujeme“, stránka stavu objednávky, osobná stránka knihy (neuhádnuteľný odkaz).
5. Transakčné e-maily ako šablóny + lokálny výpis do konzoly (bez odosielania).

## Napojenie na hotový kód (stav po vlne 1)

| Čo | Kde |
|---|---|
| Vstup do košíka | krok 9 odkazuje na `/[market]/kosik?projekt=<id>`; projekt je v stave `approved_by_customer`, verzia knihy uzamknutá (`book_versions.lockedAt`) |
| Prístup k projektu | podpísaná cookie konfigurátora: `hasProjectSession(projectId)` z `features/configurator/server/session.ts` |
| Cena a príplatky | `computePrice` (`domain/pricing.ts`) + `priceSelection` (`features/configurator/pricing.ts`); variant tlač/e-kniha a doplnky sa volia až v košíku |
| E-kniha po platbe | `renderBookPdfInWorker(book, "ebook")` z `server/render`, kniha cez `loadBookVersion(versionId)` z `features/book/server/versions.ts`; `meta.orderRef` = číslo objednávky |
| Tlačové PDF | `"print-interior"` a `"print-cover"` – rovnaké volanie |
| Osobná stránka knihy | QR v tiráži vedie na `personalPageUrl()` v `features/book/server/versions.ts` – **placeholder** `/[market]/k/<projectId>`; urč bezpečný tvar (neuhádnuteľný token) a uprav túto funkciu |
| E-maily | `features/configurator/server/mailer.ts` je dočasný výpis do konzoly – tvoj `server/email` ho nahradí (konfigurátor len presmeruj) |
| Stav projektu po platbe | `approved_by_customer → paid → in_review` cez `assertTransition` |

## Vlastníctvo

`app/src/app/[market]/kosik/`, `app/src/app/[market]/objednavka/`, `app/src/app/[market]/moja-kniha/`,
`app/src/features/checkout/`, `app/src/server/payments/`, `app/src/server/email/`.

## Hotovo, keď

- Objednávka v SK aj CZ „zaplatená“ placeholderom spustí výrobu práve raz (dvojitá notifikácia nič nepokazí).
- Meno dieťaťa ani fotka sa neukladajú do objednávky ani e-mailových údajov (O2, A2).
