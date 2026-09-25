"use client";

/*
  Dvojstrana „02 Nahráte fotku“ v hero knihe: fotka dieťaťa (polaroid), ktorú
  postupne prekryjú ilustračné štýly. Prechod medzi štýlmi je farebná opona
  (podľa „Curtains: Scope“, motion.dev), štítok na fotke sa prepíše ako na
  písacom stroji (podľa „Typewriter: change content“). Oba príklady sú v Motion+,
  toto je vlastná implementácia.

  Beží len kým je dvojstrana otvorená (active); pri obmedzení animácií stojí
  na prvom štýle. Obrázky: HERO_STYLE_IMAGES – kým chýbajú, kreslí sa vektorová
  ilustrácia v danom štýle (HeroPortraits).
*/

import Image from "next/image";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useEffect, useRef, useState } from "react";

import { STYLES } from "@/config/catalog";
import { StylePortrait, type Look } from "./HeroPortraits";

const SEQUENCE: Look[] = ["photo", ...STYLES];

/**
 * Obrázky pre ukážku (rovnaké dieťa: fotka a 4 štýly), napr. "/hero/styles/watercolor.webp".
 * null = zástupná kresba. Fotka musí byť ilustračná (so súhlasom / z fotobanky), nie zákazníka.
 */
export const HERO_STYLE_IMAGES: Record<Look, string | null> = {
  photo: null,
  watercolor: null,
  modern: null,
  animated: null,
  crayon: null,
};

const CURTAIN: Record<Look, string> = {
  photo: "#17140f",
  watercolor: "#00a5a0",
  modern: "#ff661a",
  animated: "#5e3f61",
  crayon: "#ffd166",
};

const HOLD_MS = 2600;

export function HeroStyleShowcase({
  active,
  labels,
  text,
}: {
  active: boolean;
  /** Názvy: photo = „Fotka“, ďalej štýly v poradí STYLES. */
  labels: Record<Look, string>;
  text: string;
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0); // index v SEQUENCE, ktorý je práve vidieť
  const [scope, animate] = useAnimate();
  const busy = useRef(false);
  const label = useTypewriter(labels[SEQUENCE[shown]], !reduceMotion);

  const go = async (next: number) => {
    if (busy.current || next === shown) return;
    busy.current = true;
    const look = SEQUENCE[next];
    if (reduceMotion) {
      setShown(next);
    } else {
      // Opona prejde zľava, pod ňou sa vymení obrázok, odíde doprava.
      await animate("[data-curtain]", { backgroundColor: CURTAIN[look] }, { duration: 0 });
      await animate("[data-curtain]", { scaleX: [0, 1], originX: 0 }, { duration: 0.38, ease: EASE.inOut });
      setShown(next);
      await animate("[data-curtain]", { scaleX: [1, 0], originX: 1 }, { duration: 0.38, ease: EASE.inOut, delay: 0.05 });
    }
    busy.current = false;
  };

  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  // Automatické striedanie, kým je dvojstrana otvorená.
  useEffect(() => {
    if (!active || reduceMotion) return;
    const timer = window.setTimeout(() => goRef.current((shown + 1) % SEQUENCE.length), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduceMotion, shown]);

  // Po zatvorení dvojstrany začne ukážka nabudúce znova od fotky (úprava stavu počas vykreslenia).
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setShown(0);
  }

  const look = SEQUENCE[shown];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2.4cqw] px-[9%] pb-[9%]">
      <div ref={scope} className="w-[58%] -rotate-2 rounded-[0.6cqw] bg-white p-[1.4cqw] pb-[1cqw] shadow-[0_0.6cqw_1.6cqw_-0.4cqw_rgb(23_20_15/0.35)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[0.3cqw] bg-[#efe7d8]">
          {HERO_STYLE_IMAGES[look] ? (
            <Image src={HERO_STYLE_IMAGES[look]!} alt="" fill sizes="20vw" className="object-cover" />
          ) : (
            <StylePortrait look={look} />
          )}
          <motion.div data-curtain className="absolute inset-0 origin-left" style={{ scaleX: 0 }} />
        </div>
        <p className="mt-[0.9cqw] flex h-[2.4cqw] items-center font-heading text-[1.9cqw] font-extrabold text-[#2a241c]">
          {label}
          <span aria-hidden className="ml-[0.2cqw] inline-block h-[1.9cqw] w-[0.25cqw] animate-pulse bg-brand-orange" />
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-[0.8cqw]">
        {STYLES.map((id) => {
          const index = SEQUENCE.indexOf(id);
          const on = shown === index;
          return (
            <button
              key={id}
              type="button"
              tabIndex={-1}
              onClick={() => go(index)}
              className={
                "rounded-full px-[1.4cqw] py-[0.6cqw] text-[1.25cqw] font-semibold transition-colors " +
                (on ? "bg-brand-orange text-white" : "bg-white/70 text-[#3a3228] ring-1 ring-[#d9cfb8] hover:bg-white")
              }
            >
              {labels[id]}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[1.75cqw] leading-relaxed text-pretty text-[#3a3228] mix-blend-multiply">{text}</p>
    </div>
  );
}

/** Zmaže starý text po písmenách a napíše nový (aj pre stranu „Dieťa“). */
export function useTypewriter(target: string, animated: boolean) {
  const [text, setText] = useState(target);
  useEffect(() => {
    if (!animated) return;
    let cancelled = false;
    let current = text;
    const tick = () => {
      if (cancelled) return;
      if (!target.startsWith(current)) {
        current = current.slice(0, -1);
        setText(current);
        window.setTimeout(tick, 40);
      } else if (current.length < target.length) {
        current = target.slice(0, current.length + 1);
        setText(current);
        window.setTimeout(tick, 75);
      }
    };
    const start = window.setTimeout(tick, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
    // text je len počiatočný stav – písanie riadi len zmena cieľa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, animated]);
  return animated ? text : target;
}
