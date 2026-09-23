/*
  Sťahovanie zdrojov z Wikimedie (Wikipédia, Wikislovník) s lokálnou cache.
  Wikimedia vyžaduje popisný User-Agent a rozumné tempo požiadaviek.
  Cache: app/data/names/.cache/ (mimo gitu – dá sa kedykoľvek stiahnuť znova).
*/

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.resolve(import.meta.dirname, "../../data/names");
export const CACHE_DIR = path.join(DATA_DIR, ".cache");

const USER_AGENT = "knizka-name-dictionary/1.0 (TAKTIK; build script; contact: redakcia)";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type WikiPage = { title: string; revid: number; wikitext: string };

async function api(host: string, params: Record<string, string>): Promise<unknown> {
  const url = `https://${host}/w/api.php`;
  const body = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 1; ; attempt++) {
    // POST – dávka textov na rozbalenie by sa do URL nezmestila.
    const response = await fetch(url, { method: "POST", body, headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return response.json();
    if (attempt >= 8) throw new Error(`${host}: HTTP ${response.status}`);
    // 429 = príliš rýchlo; Retry-After udáva sekundy.
    const retryAfter = Number(response.headers.get("retry-after")) || 0;
    await sleep(Math.max(retryAfter * 1000, 5000 * attempt));
  }
}

async function readCache<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(CACHE_DIR, file), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeCache(file: string, value: unknown) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, file), JSON.stringify(value));
}

type RevisionsResponse = {
  query?: {
    pages: {
      title: string;
      missing?: boolean;
      revisions?: { revid: number; slots: { main: { content: string } } }[];
    }[];
    normalized?: { from: string; to: string }[];
  };
};

/**
 * Stiahne stránky (po 50 v jednej požiadavke). Chýbajúce stránky sa v cache
 * zapamätajú ako null, aby sa pri ďalšom behu nesťahovali znova.
 */
export async function fetchPages(host: string, titles: string[]): Promise<Map<string, WikiPage | null>> {
  const cacheFile = `${host}.json`;
  const cache = (await readCache<Record<string, WikiPage | null>>(cacheFile)) ?? {};
  const missing = [...new Set(titles)].filter((title) => !(title in cache));

  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const data = (await api(host, {
      action: "query",
      prop: "revisions",
      rvprop: "ids|content",
      rvslots: "main",
      titles: batch.join("|"),
    })) as RevisionsResponse;
    const renamed = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of data.query?.pages ?? []) {
      const title = renamed.get(page.title) ?? page.title;
      const revision = page.revisions?.[0];
      cache[title] = revision
        ? { title: page.title, revid: revision.revid, wikitext: revision.slots.main.content }
        : null;
    }
    // Stránky, ktoré API nevrátilo vôbec (neplatný názov), tiež označíme.
    for (const title of batch) if (!(title in cache)) cache[title] = null;
    await writeCache(cacheFile, cache);
    process.stdout.write(`  ${host}: ${Math.min(i + 50, missing.length)}/${missing.length}\r`);
    await sleep(3000);
  }
  if (missing.length) process.stdout.write("\n");

  return new Map([...new Set(titles)].map((title) => [title, cache[title] ?? null]));
}

export async function fetchPage(host: string, title: string): Promise<WikiPage> {
  const page = (await fetchPages(host, [title])).get(title);
  if (!page) throw new Error(`${host}: stránka „${title}“ neexistuje`);
  return page;
}

/**
 * Rozbalí šablóny (po dávkach) a vráti výsledok ku každému kľúču. Šablóny modulov
 * sk-ndecl / cs-ndecl dostanú lemu parametrom `pagename`, preto stačí jedna
 * požiadavka na celú dávku. Výsledky sa cachujú.
 */
export async function expandTemplates(host: string, items: { key: string; text: string }[]): Promise<Map<string, string>> {
  const cacheFile = `${host}-expanded.json`;
  const cache = (await readCache<Record<string, string>>(cacheFile)) ?? {};
  const missing = items.filter((item) => !(item.key in cache));
  const MARK = (i: number) => `\n@@@${i}@@@\n`;

  for (let i = 0; i < missing.length; i += 40) {
    const batch = missing.slice(i, i + 40);
    const data = (await api(host, {
      action: "expandtemplates",
      prop: "wikitext",
      title: "Wiktionary:Sandbox",
      text: batch.map((item, j) => MARK(j) + item.text).join(""),
    })) as { expandtemplates?: { wikitext?: string } };
    const parts = (data.expandtemplates?.wikitext ?? "").split(/\n?@@@(\d+)@@@\n?/);
    for (let k = 1; k < parts.length; k += 2) cache[batch[Number(parts[k])].key] = parts[k + 1] ?? "";
    for (const item of batch) cache[item.key] ??= "";
    await writeCache(cacheFile, cache);
    process.stdout.write(`  ${host} (šablóny): ${Math.min(i + 40, missing.length)}/${missing.length}\r`);
    await sleep(3000);
  }
  if (missing.length) process.stdout.write("\n");
  return new Map(items.map((item) => [item.key, cache[item.key] ?? ""]));
}

/** Názvy stránok v kategórii (hlavný menný priestor) vrátane podkategórií do hĺbky `depth`. Cachuje sa. */
export async function fetchCategoryMembers(host: string, category: string, depth = 1): Promise<string[]> {
  const cacheFile = `${host}-categories.json`;
  const cache = (await readCache<Record<string, { pages: string[]; subcats: string[] }>>(cacheFile)) ?? {};
  if (!cache[category]) {
    const pages: string[] = [];
    const subcats: string[] = [];
    let cont: string | undefined;
    do {
      const data = (await api(host, {
        action: "query",
        list: "categorymembers",
        cmtitle: category,
        cmlimit: "500",
        cmtype: "page|subcat",
        ...(cont ? { cmcontinue: cont } : {}),
      })) as { query?: { categorymembers: { title: string; ns: number }[] }; continue?: { cmcontinue: string } };
      for (const member of data.query?.categorymembers ?? []) {
        if (member.ns === 0) pages.push(member.title);
        if (member.ns === 14) subcats.push(member.title);
      }
      cont = data.continue?.cmcontinue;
      await sleep(1500);
    } while (cont);
    cache[category] = { pages, subcats };
    await writeCache(cacheFile, cache);
  }
  const { pages, subcats } = cache[category];
  if (depth <= 0) return pages;
  const nested = [];
  for (const subcat of subcats) nested.push(...(await fetchCategoryMembers(host, subcat, depth - 1)));
  return [...new Set([...pages, ...nested])];
}
