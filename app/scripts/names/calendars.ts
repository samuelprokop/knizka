/*
  Parsovanie kalendárov menín z Wikipédie (J8). Kalendár je vlastnosť TRHU:
  slovenský kalendár platí pre trh sk, český pre trh cz – bez ohľadu na jazyk knihy.

  Zdroje (CC BY-SA 4.0; samotné dátumy sú fakty, uvádzame ich pre úplnosť):
    sk.wikipedia.org/wiki/Meniny_na_Slovensku – podľa Oficiálneho kalendária MK SR
    cs.wikipedia.org/wiki/Jmeniny_v_Česku – občiansky kalendár z 90. rokov
*/

export type CalendarEntry = {
  name: string;
  /** "MM-DD" */
  date: string;
  /** SK: tlačené v kalendári (tučné). Ostatné mená sú k dátumu len priradené. CZ: vždy true. */
  official: boolean;
};

const LINK = /('''\s*)?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

const pad = (n: number) => String(n).padStart(2, "0");

const cleanName = (raw: string) => raw.replace(/\s*\(.*\)\s*$/, "").trim();

const SK_MONTHS = [
  "Január", "Február", "Marec", "Apríl", "Máj", "Jún",
  "Júl", "August", "September", "Október", "November", "December",
];

export function parseSkCalendar(wikitext: string): CalendarEntry[] {
  const section = wikitext.split("== Slovenský menný kalendár ==")[1] ?? "";
  const entries: CalendarEntry[] = [];
  let month = 0;
  let day = 0;
  for (const line of section.split("\n")) {
    const heading = line.match(/^===\s*(.+?)\s*===/);
    if (heading) {
      month = SK_MONTHS.indexOf(heading[1]) + 1;
      day = 0;
      continue;
    }
    if (!month || !/^#\s/.test(line)) continue;
    day++;
    for (const match of line.matchAll(LINK)) {
      const name = cleanName(match[3] ?? match[2]);
      if (!/^\p{Lu}\p{Ll}+$/u.test(name)) continue;
      entries.push({ name, date: `${pad(month)}-${pad(day)}`, official: Boolean(match[1]) });
    }
  }
  return entries;
}

const CS_MONTHS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

function csDate(link: string): string | null {
  const match = link.match(/^(\d{1,2})\.\s*(\S+)$/);
  if (!match) return null;
  const month = CS_MONTHS.indexOf(match[2]) + 1;
  return month ? `${pad(month)}-${pad(Number(match[1]))}` : null;
}

export function parseCsCalendar(wikitext: string): CalendarEntry[] {
  const seen = new Set<string>();
  const entries: CalendarEntry[] = [];
  const add = (name: string, date: string) => {
    const key = `${name}|${date}`;
    if (seen.has(key) || !/^\p{Lu}\p{Ll}+$/u.test(name)) return;
    seen.add(key);
    entries.push({ name, date, official: true });
  };

  for (const line of wikitext.split("\n")) {
    if (!line.includes("||")) continue;
    const [left, right] = line.split("||", 2);
    const leftLinks = [...left.matchAll(LINK)].map((m) => m[2].trim());
    const rightLinks = [...right.matchAll(LINK)].map((m) => ({ target: m[2].trim(), label: cleanName(m[3] ?? m[2]) }));

    // Sekcia „podľa dátumu“: | [[2. leden]] || [[Karina]], …
    const leftDate = leftLinks.length === 1 ? csDate(leftLinks[0]) : null;
    if (leftDate) {
      for (const link of rightLinks) add(link.label, leftDate);
      continue;
    }
    // Sekcia „podľa mena“: | [[Adam]] || [[24. prosinec]]
    const leftName = [...left.matchAll(LINK)][0];
    if (!leftName) continue;
    for (const link of rightLinks) {
      const date = csDate(link.target);
      if (date) add(cleanName(leftName[3] ?? leftName[2]), date);
    }
  }
  return entries;
}
