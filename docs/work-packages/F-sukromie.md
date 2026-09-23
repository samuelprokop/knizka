# F – Súkromie, súhlasy a mazanie údajov

**Cieľ:** súkromie ako predajná vlastnosť – fotka dieťaťa žije najviac 7 dní a po schválení
Karty sa zmaže do 24 hodín; všetko preukázateľne.

**Zdroj:** špecifikácia (02) Súkromie, GDPR, AI Act (S1 – S19, lehoty uchovávania), A2;
proces (03) Zmazanie údajov; texty `photo.consent.*`, `ai.notice.*`.

## Rozsah

1. **Plánovač mazania:** fotky (`photos.deleteAfter`, 24 h po schválení Karty), nezaplatené projekty
   po 30 dňoch s upozornením 3 dni vopred, zaplatené knihy po 12 mesiacoch, technické logy 90 dní;
   každé zmazanie do `audit_log`.
2. **Samoobslužné zmazanie:** „Zmazať všetko“ v konfigurátore, zmazanie knihy a uložených postáv
   z osobnej stránky; odvolanie marketingového súhlasu.
3. **Súhlasy:** jednotná funkcia na uloženie súhlasu (čas, zariadenie, kľúč a jazyk textu);
   prehľad súhlasov projektu.
4. **Stránka „Čo sa deje s fotkou vášho dieťaťa“** (S4) v SK aj CZ.
5. **AI Act (S7, S16):** označenie AI obsahu v metadátach e-knihy a PDF (spolupráca s C), text v tiráži.
6. **Strážca analytiky (A2):** pomocná funkcia na odosielanie udalostí, ktorá odmietne osobné údaje;
   test, že meno dieťaťa ani obrázky neodchádzajú.

## Vlastníctvo

`app/src/server/privacy/`, `app/src/server/analytics/`, `app/scripts/retention.ts`,
`app/src/app/[market]/sukromie/`.

## Hotovo, keď

- Test preukáže zmazanie fotiek v lehote a záznam v audite.
- Žiadna cesta v kóde neposiela fotku, meno dieťaťa ani text venovania do analytiky či e-mailových nástrojov.
