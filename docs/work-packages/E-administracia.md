# E – Administrácia štúdia

**Cieľ:** redaktor, grafik, výroba a správca trhu robia svoju prácu bez programátora.

**Zdroj:** špecifikácia (02) Administrácia (moduly a roly), Konfigurovateľnosť procesu (03),
Kontroly pri publikovaní, I11 – I12, J10, J14.

## Rozsah (prvá verzia)

1. `/admin` s vlastným root layoutom (mimo `[market]`, `proxy.ts` ho už vynecháva), prihlásenie
   pre interných používateľov (roly podľa špecifikácie; 2FA navrhnúť, môže prísť neskôr).
2. **Knižnica príbehov:** zoznam, editor edície po dvojstranách (text so značkami `{meno:X}`,
   záložná veta, opis scény), kontrola dĺžky voči layoutom, publikovanie s verziou.
3. **Slovník mien:** prehľad, úprava tvarov, fronta mien na jazykovú kontrolu (dáta z balíka J).
4. **Fronta grafika a redaktora:** zoznam kníh na kontrolu, dvojstrany vedľa Kariet, akcie
   schváliť / vrátiť s poznámkou (nad mock dátami).
5. **Nastavenia trhu:** zatiaľ len čítanie `config/markets.ts` a `config/catalog.ts`; návrh, ako
   ich presunúť do DB, aby sa dali meniť bez nasadenia (limity, poradie krokov, ceny).
6. **Audit:** každé zobrazenie fotky a citlivá akcia do `audit_log`.

## Vlastníctvo

`app/src/app/admin/`, `app/src/features/admin/`.

## Hotovo, keď

- Redaktor vie pridať a publikovať nový príbeh v SK aj CZ bez zásahu do kódu.
- Interná časť je nedostupná bez prihlásenia a každá akcia má záznam v audite.
