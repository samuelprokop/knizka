import { asc, eq, like } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db, schema } from "@/db";
import { isUiPreview } from "@/lib/ui-preview";

/*
  Katalóg obrazoviek: odkaz na každú obrazovku projektu v každom dôležitom
  stave, nad ukážkovými dátami z `npm run ui:setup`. Len v náhľade UI.
*/

export const dynamic = "force-dynamic";

type Item = { label: string; note?: string; href: string | null };
type Group = { title: string; note?: string; items: Item[] };

async function loadDemo() {
  const projects = await db
    .select({ id: schema.projects.id, email: schema.projects.email, token: schema.projects.personalToken, market: schema.projects.market })
    .from(schema.projects)
    .where(like(schema.projects.email, "%@ui.local"));
  const bySlug = new Map(projects.map((p) => [p.email!.replace("@ui.local", ""), p]));

  const paid = bySlug.get("zaplatena");
  const [order] = paid ? await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.projectId, paid.id)).limit(1) : [];
  const [story] = await db.select({ id: schema.stories.id }).from(schema.stories).orderBy(asc(schema.stories.createdAt)).limit(1);
  const [task] = await db.select({ id: schema.nameReviewTasks.id }).from(schema.nameReviewTasks).limit(1);
  const [name] = await db.select({ id: schema.nameDictionary.id }).from(schema.nameDictionary).where(eq(schema.nameDictionary.name, "Janko")).limit(1);

  return { bySlug, orderId: order?.id ?? null, storyId: story?.id ?? null, taskId: task?.id ?? null, nameId: name?.id ?? null };
}

export default async function UiCatalogPage() {
  if (!isUiPreview()) notFound();
  const demo = await loadDemo();

  const step = (slug: string, krok: string, query = ""): string | null => {
    const project = demo.bySlug.get(slug);
    return project ? `/${project.market}/kniha/${project.id}/${krok}${query}` : null;
  };
  const project = (slug: string) => demo.bySlug.get(slug) ?? null;
  const approved = project("schvalena");
  const paid = project("zaplatena");
  const story = demo.storyId;

  const groups: Group[] = [
    {
      title: "Úvodná stránka",
      items: [
        { label: "Hero s knihou – slovensky", href: "/sk" },
        { label: "Hero s knihou – česky", href: "/cz" },
        { label: "Cookie box", note: "zobrazí sa aj po voľbe", href: "/sk?cookies=1" },
        { label: "Cookie box – česky", href: "/cz?cookies=1" },
      ],
    },
    {
      title: "1 · Dieťa",
      items: [
        { label: "Nová kniha", note: "prázdny formulár", href: "/sk/vytvorit" },
        { label: "Nová kniha – česky", href: "/cz/vytvorit" },
        { label: "Úprava vyplneného kroku", href: step("krok-4", "dieta") },
        { label: "Meno mimo slovníka", note: "Radoslavko – upozornenie a kontrola tvarov", href: step("meno-mimo-slovnika", "dieta") },
        { label: "Nesklonné meno", note: "Zoe", href: step("nesklonne-meno", "dieta") },
      ],
    },
    {
      title: "2 · Fotka alebo opis",
      items: [
        { label: "Bez fotky", note: "súhlasy a nahratie", href: step("krok-2", "fotka") },
        { label: "S fotkami", note: "skvelá + použiteľná s radou", href: step("krok-2-fotky", "fotka") },
        { label: "Opis dieťaťa namiesto fotky", href: step("krok-2", "fotka", "?opis=1") },
      ],
    },
    {
      title: "3 · Štýl a Karta hrdinu",
      items: [
        { label: "Výber štýlu", note: "mriežka 4 portrétov", href: step("krok-3-styl", "podoba") },
        { label: "Karta hrdinu na schválenie", href: step("krok-3-karta", "podoba") },
        { label: "Zmena štýlu", href: step("krok-3-karta", "podoba", "?zmena=1") },
        { label: "Podoba sa ešte nedarí", note: "vyčerpané 3 pokusy", href: step("krok-3-vycerpane", "podoba") },
        { label: "Po schválení", href: step("krok-4", "podoba", "?schvalene=1") },
      ],
    },
    {
      title: "4 · Ďalšie postavy a sprievodca",
      items: [
        { label: "Otázka „Má byť v knihe ešte niekto?“", href: step("krok-4", "postavy") },
        { label: "So sestrou Aničkou", note: "Karta postavy", href: step("krok-4-postavy", "postavy") },
      ],
    },
    {
      title: "5 · Príbeh",
      items: [
        { label: "Knižnica príbehov", href: step("krok-5", "pribeh") },
        { label: "Detail príbehu", href: story ? step("krok-5", "pribeh", `?pribeh=${story}`) : null },
        { label: "Vlastné detaily (cesta B)", href: story ? step("krok-5", "pribeh", `?pribeh=${story}&v=detaily`) : null },
        { label: "Nenašli ste? Ako pokračovať", href: step("krok-5", "pribeh", "?v=vlastny") },
        { label: "Príbeh na mieru – otázky (cesta C)", href: step("krok-5", "pribeh", "?v=otazky") },
        { label: "Príbeh na mieru – 3 námety", href: step("krok-5-na-mieru", "pribeh", "?v=namety") },
        { label: "Vlastný príbeh (cesta D)", href: step("krok-5", "pribeh", "?v=napisat") },
        { label: "Text príbehu na schválenie", href: step("krok-5-text", "pribeh", "?v=text") },
      ],
    },
    {
      title: "6 · Vzhľad knihy",
      items: [{ label: "Layout, formát, obálka, aktivity", note: "ukážková dvojstrana", href: step("krok-6", "vzhlad") }],
    },
    {
      title: "7 · Generovanie",
      items: [{ label: "Kniha sa skladá", note: "5 z 12 dvojstrán hotových", href: step("krok-7", "generovanie") }],
    },
    {
      title: "8 · Náhľad a editor",
      items: [
        { label: "Listovací náhľad", note: "jedna strana upravená", href: step("krok-8", "nahlad") },
        { label: "Náhľad – česky (Petr)", href: step("cz-krok-8", "nahlad") },
      ],
    },
    {
      title: "9 · Venovanie a schválenie",
      items: [
        { label: "Venovanie a kontrolný zoznam", href: step("krok-8", "schvalenie") },
        { label: "Kniha schválená", href: step("schvalena", "schvalenie") },
      ],
    },
    {
      title: "Nákup a po nákupe",
      items: [
        { label: "Košík", note: "nálepka úvodnej zľavy odkryje VITAJTE10 (CZ VITEJTE10) · kódy: VITAJTE10, NARODENINY15, BABKA20, ZLAVA5-SK, DARCEK-SK · SLEVA100-CZ = chyba trhu · iný = neplatný", href: approved ? `/sk/kosik?projekt=${approved.id}` : null },
        { label: "Pokladňa", href: approved ? `/sk/objednavka?projekt=${approved.id}&variant=print_ebook&extraCopies=0&giftWrap=0&voucher=` : null },
        { label: "Pokladňa – platba kartou", note: "rozbalený formulár karty", href: approved ? `/sk/objednavka?projekt=${approved.id}&variant=print_ebook&extraCopies=0&giftWrap=0&voucher=&karta=1` : null },
        { label: "Ďakujeme", href: demo.orderId ? `/sk/objednavka/${demo.orderId}/dakujeme` : null },
        { label: "Stav objednávky", href: demo.orderId ? `/sk/objednavka/${demo.orderId}` : null },
        { label: "Neúspešná platba", href: demo.orderId ? `/sk/objednavka/${demo.orderId}/vysledok` : null },
        { label: "Osobná stránka knihy", note: "za QR kódom v tiráži", href: paid ? `/sk/moja-kniha/${paid.token}` : null },
        { label: "Neplatný odkaz na návrat", href: "/sk/kniha/neplatny-odkaz" },
      ],
    },
    {
      title: "Načítavanie (skeleton)",
      items: [
        { label: "Ukážka komponentu", note: "kosti, zotretie karty, prelínanie zoznamu", href: "/ui/nacitavanie" },
        { label: "Kostra kroku konfigurátora", note: "pri prechode medzi krokmi", href: "/ui/nacitavanie?kostra=konfigurator" },
        { label: "Kostra košíka a objednávky", href: "/ui/nacitavanie?kostra=kosik" },
        { label: "Kreslenie portrétov (krok 3)", note: "kosti v mriežke štýlov", href: step("krok-3-kreslenie", "podoba") },
        { label: "Generovanie dvojstrán (krok 7)", note: "kosti pri nehotových dvojstranách", href: step("krok-7", "generovanie") },
      ],
    },
    {
      title: "Notifikácie",
      items: [
        { label: "Ukážka notifikácií", note: "pridávanie, zatváranie, zoznam", href: "/ui/notifikacie" },
        { label: "Vloženie do košíka", note: "animácia po „Schváliť a objednať“", href: "/ui/animacie" },
        { label: "Po schválení podoby", note: "notifikácia pri kroku 4", href: step("krok-4", "postavy", "?schvalene=1") },
      ],
    },
    {
      title: "Kniha (renderer)",
      items: [{ label: "Vývojová ukážka knihy", note: "všetky voľby v URL, PDF na stiahnutie", href: "/sk/nahlad?meno=Janko&rod=boy" }],
    },
    {
      title: "Administrácia",
      note: "v náhľade prihlásený ako správca",
      items: [
        { label: "Prehľad", href: "/admin" },
        { label: "Prihlásenie", href: "/admin/prihlasenie" },
        { label: "Knižnica príbehov", href: "/admin/pribehy" },
        { label: "Editor edície príbehu", href: story ? `/admin/pribehy/${story}/sk` : null },
        { label: "Nový príbeh", href: "/admin/pribehy/novy" },
        { label: "Slovník mien", href: "/admin/slovnik" },
        { label: "Úprava mena", href: demo.nameId ? `/admin/slovnik/${demo.nameId}` : null },
        { label: "Nové meno", href: "/admin/slovnik/novy" },
        { label: "Fronta jazykovej kontroly", href: "/admin/slovnik/fronta" },
        { label: "Úloha jazykovej kontroly", href: demo.taskId ? `/admin/slovnik/fronta/${demo.taskId}` : null },
        { label: "Fronta kontroly kníh", href: "/admin/fronta" },
        { label: "Kontrola knihy", href: paid ? `/admin/fronta/${paid.id}` : null },
        { label: "Nastavenia trhu", href: "/admin/trh" },
        { label: "Používatelia", href: "/admin/pouzivatelia" },
        { label: "Audit", href: "/admin/audit" },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-orange">Náhľad UI</p>
        <h1 className="mt-1 font-heading text-4xl font-extrabold">Katalóg obrazoviek</h1>
        <p className="mt-2 max-w-2xl text-ink/70">
          Každá obrazovka s ukážkovými dátami. Nič sa neukladá, negeneruje ani neplatí – akcie
          len ukážu hlášku náhľadu. Späť sem vedie tlačidlo „Katalóg UI“ vpravo dole.
        </p>
        {demo.bySlug.size === 0 && (
          <p className="mt-4 rounded-2xl bg-brand-orange/10 p-4 text-sm">
            Ukážkové dáta chýbajú – spustite <code className="font-semibold">npm run ui:setup</code>.
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-3xl bg-white p-5 ring-1 ring-ink/10">
            <h2 className="font-heading text-xl font-extrabold">{group.title}</h2>
            {group.note && <p className="text-sm text-ink/60">{group.note}</p>}
            <ul className="mt-3 flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link href={item.href} className="group flex items-baseline gap-2 rounded-xl px-2 py-1.5 transition hover:bg-paper">
                      <span className="font-medium text-ink group-hover:text-brand-orange-dark">{item.label}</span>
                      {item.note && <span className="text-sm text-ink/55">{item.note}</span>}
                    </Link>
                  ) : (
                    <span className="flex items-baseline gap-2 px-2 py-1.5 text-ink/40">
                      {item.label} <span className="text-sm">(chýbajú ukážkové dáta)</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
