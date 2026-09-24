/*
  Súhlas s cookies (klient). Nevyhnutné cookies bežia vždy; analytické a
  marketingové len po voľbe "accepted". Voľba sa ukladá do cookie na 6 mesiacov
  a pri zmene sa vyšle udalosť – budúca analytika (balík F) sa naň napojí
  cez readCookieConsent() / onCookieConsentChange().
*/

export type CookieConsent = "accepted" | "declined";

const COOKIE = "cookie_consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 182;
const CHANGE_EVENT = "cookie-consent-change";

/** Box otvorený ručne (odkaz „Nastavenia cookies“ alebo ?cookies v URL). */
let forcedOpen: boolean | null = null;

export function readCookieConsent(): CookieConsent | null {
  const match = document.cookie.match(/(?:^|;\s*)cookie_consent=(accepted|declined)/);
  return match ? (match[1] as CookieConsent) : null;
}

export function saveCookieConsent(value: CookieConsent) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE}=${value}; max-age=${MAX_AGE_SECONDS}; path=/; samesite=lax${secure}`;
  forcedOpen = false;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Znova otvorí box (zmena alebo odvolanie súhlasu). */
export function openCookieSettings() {
  forcedOpen = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onCookieConsentChange(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Stav pre useSyncExternalStore: či má byť box otvorený. */
export function cookieBoxSnapshot(): "open" | "closed" {
  if (forcedOpen === null) forcedOpen = new URLSearchParams(location.search).has("cookies");
  return forcedOpen || readCookieConsent() === null ? "open" : "closed";
}
