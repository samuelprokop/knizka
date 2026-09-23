# C – Renderer knihy (náhľad, e-kniha, tlačové PDF)

**Cieľ:** z jednej uzamknutej verzie knihy vzniká náhľad, e-kniha aj tlačové PDF z tej istej šablóny,
takže sa nemôžu líšiť. Formáty **A4 a A5**, 32 alebo 40 strán.

**Zdroj:** špecifikácia (02) Výstupy a výroba, Typy strán, Čitateľské úrovne a layouty, Výtvarné štýly
a layouty (4 layouty), I3 (300 dpi, 3 mm spadávka), S7 (strojovo čiteľné označenie AI);
proces (03) Krok 6 (ukážková dvojstrana), Krok 8 (listovací náhľad s vodoznakom).

## Rozsah

1. **Model knihy:** funkcia, ktorá z `projects` + edície príbehu + Kariet postáv zostaví zoznam strán
   (obálka, predsádky, titul/venovanie, 12/16 dvojstrán, aktivity, sprievodca pre rodiča, tiráž s QR,
   zadná strana) a uloží ho do `book_versions` / `book_pages`. Texty cez jazykový modul
   (`renderNameTokens`, `applyTypography`).
2. **Layouty:** klasický, panoramatický, obrázkový, prvé čítanie – mriežka, textové rámy, limity znakov;
   4 obálky; témy a páry písiem. Ako React komponenty zdieľané náhľadom aj PDF.
3. **Ukážková dvojstrana** pre krok 6 (komponent, ktorý použije balík A).
4. **Listovací náhľad** pre krok 8: dvojstrany s otáčaním, vodoznak, znížené rozlíšenie, miniatúry.
5. **PDF:** e-kniha (RGB, AI označenie v metadátach) a tlačové PDF (spadávka, orezové značky, chrbát
   podľa rozsahu); CMYK/PDF-X navrhnúť, kým nebude profil tlačiarne. Rozmery A4 a A5.
6. **Strany aktivít:** generátory obkresľovania mena, hľadania písmen, počítania, bludiska, diplomu.

## Vlastníctvo

`app/src/features/book/` (model, layouty, komponenty), `app/src/server/render/` (PDF),
route `app/src/app/[market]/nahlad/` (demo náhľad pre vývoj).

## Mimo rozsahu

Generovanie ilustrácií (B – použi mock obrázky), tlačiareň a výroba (neskôr), osobná stránka knihy (D).

## Hotovo, keď

- Vzorový príbeh sa vysadí vo všetkých 4 layoutoch, A4 aj A5, 32 aj 40 strán, s menom 2 aj 12 znakov
  bez pretečenia textu (automatický test).
- Náhľad v prehliadači a PDF tej istej verzie sú obsahovo zhodné.
