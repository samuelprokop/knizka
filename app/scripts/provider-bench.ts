/*
  Porovnávací test poskytovateľov (fáza 0, S3): na sade testovacích hrdinov
  spustí každý registrovaný ImageProvider a zapíše výsledky (latencia, úspech,
  náklad) + tabuľku kritérií na doplnenie. Zatiaľ je zaregistrovaný len mock –
  skript je pripravený spustiť sa znova, keď pribudne reálny adaptér.
  Spúšťa sa: npm run bench:providers
*/

import { listImageProviders } from "../src/server/ai";
import type { CharacterPortraitRequest } from "../src/server/ai/types";
import type { StyleId } from "../src/config/catalog";

const STYLES: StyleId[] = ["watercolor", "crayon", "modern", "animated"];

const TEST_HEROES: { label: string; request: Omit<CharacterPortraitRequest, "style"> }[] = [
  { label: "dievča, 4 roky, opis", request: { photoKeys: [], appearance: { hairColor: "blond", skin: "light" }, age: 4 } },
  { label: "chlapec, 7 rokov, opis", request: { photoKeys: [], appearance: { hairColor: "black", skin: "dark" }, age: 7 } },
  { label: "dieťa, 9 rokov, hraničný vek", request: { photoKeys: [], appearance: { hairColor: "red", skin: "medium" }, age: 9 } },
];

type Result = { provider: string; hero: string; style: StyleId; ok: boolean; ms: number; costMicroUsd?: number; error?: string };

async function benchProvider(provider: ReturnType<typeof listImageProviders>[number]): Promise<Result[]> {
  const results: Result[] = [];
  for (const hero of TEST_HEROES) {
    for (const style of STYLES) {
      const started = Date.now();
      try {
        const { meta } = await provider.portrait({ ...hero.request, style });
        results.push({ provider: provider.id, hero: hero.label, style, ok: true, ms: Date.now() - started, costMicroUsd: meta.costMicroUsd });
      } catch (error) {
        results.push({
          provider: provider.id,
          hero: hero.label,
          style,
          ok: false,
          ms: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return results;
}

function printReport(results: Result[]) {
  const byProvider = new Map<string, Result[]>();
  for (const r of results) byProvider.set(r.provider, [...(byProvider.get(r.provider) ?? []), r]);

  for (const [provider, rows] of byProvider) {
    const okCount = rows.filter((r) => r.ok).length;
    const avgMs = Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length);
    const totalCost = rows.reduce((s, r) => s + (r.costMicroUsd ?? 0), 0);
    console.log(`\n== ${provider} ==`);
    console.log(`úspešnosť: ${okCount}/${rows.length}   priemerná latencia: ${avgMs} ms   náklad spolu: ${totalCost} µUSD`);
    for (const r of rows.filter((r) => !r.ok)) console.log(`  chyba (${r.hero}, ${r.style}): ${r.error}`);
  }

  console.log(`
== Kritériá výberu (S3) – doplniť pri hodnotení reálnych poskytovateľov ==
| Poskytovateľ | Hosting v EÚ | Retencia dát | Spracúva fotky maloletých | Cena / obrázok |
|---|---|---|---|---|
| mock | – (lokálne úložisko) | žiadna (nič sa neposiela von) | áno, ale bez opustenia servera | 0 |
`);
}

async function main() {
  const providers = listImageProviders();
  const results = (await Promise.all(providers.map(benchProvider))).flat();
  printReport(results);
}

main().catch((error) => {
  console.error("[provider-bench] zlyhalo:", error);
  process.exit(1);
});
