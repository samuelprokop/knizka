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

## Vlastníctvo

`app/src/app/[market]/kosik/`, `app/src/app/[market]/objednavka/`, `app/src/app/[market]/moja-kniha/`,
`app/src/features/checkout/`, `app/src/server/payments/`, `app/src/server/email/`.

## Hotovo, keď

- Objednávka v SK aj CZ „zaplatená“ placeholderom spustí výrobu práve raz (dvojitá notifikácia nič nepokazí).
- Meno dieťaťa ani fotka sa neukladajú do objednávky ani e-mailových údajov (O2, A2).
