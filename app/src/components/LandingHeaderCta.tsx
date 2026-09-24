"use client";

/*
  Tlačidlo „Vytvoriť knihu“ v hlavičke úvodnej stránky. Na obrazovke má byť
  vždy len jedna výzva (Hickov zákon): na úvode a na konci knihy má hero
  vlastné hlavné tlačidlo, vtedy sa to v hlavičke skryje. Pri krokoch 01 – 04
  a pri recenziách je hlavička jediná výzva (v pätičke hlavička mizne sama).
*/

import { useEffect, useState, useSyncExternalStore } from "react";

import { heroNavigation } from "./BookHero";
import { MotionCta } from "./buttons";

export function LandingHeaderCta({ href, label }: { href: string; label: string }) {
  const current = useSyncExternalStore(heroNavigation.subscribe, heroNavigation.getCurrent, () => 0);
  const pastHero = usePastHero();
  const heroHasCta = !pastHero && (current === 0 || current === heroNavigation.stops - 1);

  return (
    <MotionCta
      href={href}
      aria-hidden={heroHasCta || undefined}
      tabIndex={heroHasCta ? -1 : undefined}
      className={
        "text-[0.9375rem] transition-[opacity,translate,scale] duration-300 motion-reduce:transition-none " +
        (heroHasCta ? "pointer-events-none -translate-y-1 opacity-0" : "opacity-100")
      }
    >
      {label}
    </MotionCta>
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
