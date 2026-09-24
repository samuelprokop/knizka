"use client";

/*
  Tlačidlo „Vytvoriť knihu“ v hlavičke úvodnej stránky. Na obrazovke má byť
  vždy len jedna výzva (Hickov zákon): na úvode a na konci knihy má hero
  vlastné hlavné tlačidlo, vtedy sa to v hlavičke skryje. Pri krokoch 01 – 04
  a pri recenziách je hlavička jediná výzva (v pätičke hlavička mizne sama).
*/

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { heroNavigation } from "./BookHero";

export function LandingHeaderCta({ href, label }: { href: string; label: string }) {
  const current = useSyncExternalStore(heroNavigation.subscribe, heroNavigation.getCurrent, () => 0);
  const pastHero = usePastHero();
  const heroHasCta = !pastHero && (current === 0 || current === heroNavigation.stops - 1);

  return (
    <Link
      href={href}
      aria-hidden={heroHasCta || undefined}
      tabIndex={heroHasCta ? -1 : undefined}
      className={
        "rounded-full bg-brand-orange-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[opacity,transform] duration-300 hover:bg-[#9a3500] focus-visible:ring-4 focus-visible:ring-brand-orange/40 focus-visible:outline-none motion-reduce:transition-none " +
        (heroHasCta ? "pointer-events-none -translate-y-1 opacity-0" : "opacity-100")
      }
    >
      {label}
    </Link>
  );
}

/** Sú recenzie (sekcia pod knihou) aspoň do polovice na obrazovke? */
function usePastHero() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = document.getElementById("recenzie");
      setPast(!!el && el.getBoundingClientRect().top < window.innerHeight * 0.5);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return past;
}
