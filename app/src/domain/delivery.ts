/*
  Orientačný dátum doručenia tlačenej knihy („stihne to do darčeka?“ – hlavná obava
  kupujúcich darčeka). Rátajú sa pracovné dni od zajtra: bez víkendov, sviatkov trhu
  s pevným dátumom a Veľkej noci (piatok, pondelok). Je to odhad – text pri ňom vždy
  hovorí „približne“, presný termín závisí od dopravcu.
*/

import type { Market } from "@/config/markets";

/** Veľkonočná nedeľa (anonymný gregoriánsky algoritmus), UTC polnoc. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function isWorkingDay(date: Date, market: Pick<Market, "holidays">): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  if (market.holidays.includes(`${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`)) return false;
  const easter = easterSunday(date.getUTCFullYear()).getTime();
  const t = date.getTime();
  return t !== easter - 2 * DAY_MS && t !== easter + DAY_MS;
}

/**
 * Deň doručenia pri objednávke v deň `from` (kalendárny dátum v čase trhu):
 * `deliveryWorkingDays` pracovných dní od nasledujúceho dňa. Vracia UTC polnoc daného dňa.
 */
export function estimatedDelivery(from: Date, market: Pick<Market, "holidays" | "deliveryWorkingDays">): Date {
  let day = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  let left = market.deliveryWorkingDays;
  while (left > 0) {
    day += DAY_MS;
    if (isWorkingDay(new Date(day), market)) left--;
  }
  return new Date(day);
}

/** „2. 10.“ v jazyku trhu (bez dňa v týždni – do vety „doručíme do {date}“ sa nemusí skloňovať). */
export function formatDeliveryDate(date: Date, market: Pick<Market, "intlLocale">): string {
  return new Intl.DateTimeFormat(market.intlLocale, { day: "numeric", month: "numeric", timeZone: "UTC" }).format(date);
}
