"use client";

import { useEffect, useState } from "react";

/*
  Stav košíka a rozpracovanej knihy na tomto zariadení (/[market]/kosik/stav) –
  jedna požiadavka na načítanie stránky, zdieľaná medzi menu a pripomienkou.
*/

export type SessionStatus = {
  cartCount: number;
  cartHref: string | null;
  continueHref: string | null;
  resume: { kind: "cart" | "progress"; text: string; href: string } | null;
};

const EMPTY: SessionStatus = { cartCount: 0, cartHref: null, continueHref: null, resume: null };
const requests = new Map<string, Promise<SessionStatus>>();

function load(market: string) {
  let request = requests.get(market);
  if (!request) {
    request = fetch(`/${market}/kosik/stav`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SessionStatus>) : EMPTY))
      .catch(() => EMPTY);
    requests.set(market, request);
    // Po návrate na stránku (iná karta, späť) sa stav načíta znova.
    request.finally(() => setTimeout(() => requests.delete(market), 5_000));
  }
  return request;
}

export function useSessionStatus(market: string): SessionStatus {
  const [status, setStatus] = useState(EMPTY);
  useEffect(() => {
    let alive = true;
    load(market).then((data) => alive && setStatus({ ...EMPTY, ...data }));
    return () => {
      alive = false;
    };
  }, [market]);
  return status;
}
