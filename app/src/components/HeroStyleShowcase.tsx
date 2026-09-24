"use client";

/*
  Dvojstrana „02 Nahráte fotku“ v hero knihe: fotka dieťaťa (polaroid), ktorú
  postupne prekryjú ilustračné štýly. Prechod medzi štýlmi je farebná opona
  (podľa „Curtains: Scope“, motion.dev), štítok na fotke sa prepíše ako na
  písacom stroji (podľa „Typewriter: change content“). Oba príklady sú v Motion+,
  toto je vlastná implementácia.

  Beží len kým je dvojstrana otvorená (active); pri obmedzení animácií stojí
  na prvom štýle. Obrázky: HERO_STYLE_IMAGES – kým chýbajú, kreslí sa zástupná
  ilustrácia v danom štýle.
*/

import Image from "next/image";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { STYLES, type StyleId } from "@/config/catalog";

type Look = "photo" | StyleId;
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
      await animate("[data-curtain]", { scaleX: [0, 1], originX: 0 }, { duration: 0.38, ease: [0.65, 0, 0.35, 1] });
      setShown(next);
      await animate("[data-curtain]", { scaleX: [1, 0], originX: 1 }, { duration: 0.38, ease: [0.65, 0, 0.35, 1], delay: 0.05 });
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
            <PlaceholderPortrait look={look} />
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

/** Zmaže starý text po písmenách a napíše nový. */
function useTypewriter(target: string, animated: boolean) {
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

// ---------------------------------------------------------------- zástupná kresba (kým nie sú obrázky)

function PlaceholderPortrait({ look }: { look: Look }) {
  const p = {
    photo: { bg: "#cfc6b8", skin: "#e7c2a0", hair: "#6b4a33", shirt: "#8fa3ad", filter: "photo" },
    watercolor: { bg: "#d9eef0", skin: "#f6cfae", hair: "#9a5a35", shirt: "#7cc6c2", filter: "wash" },
    modern: { bg: "#ffe0cc", skin: "#f4c09a", hair: "#3b2a20", shirt: "#ff661a", filter: "" },
    animated: { bg: "#e8dcf0", skin: "#ffd2b3", hair: "#7a4424", shirt: "#5e3f61", filter: "" },
    crayon: { bg: "#fff4d1", skin: "#f7c9a4", hair: "#a0592c", shirt: "#e76f51", filter: "crayon" },
  }[look];
  const eyes = look === "animated" ? 4.2 : 2.4;
  return (
    <svg viewBox="0 0 80 100" className="h-full w-full" aria-hidden>
      <defs>
        <filter id="hsw-wash">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <filter id="hsw-crayon">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id="hsw-photo">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <rect width="80" height="100" fill={p.bg} />
      <g filter={p.filter ? `url(#hsw-${p.filter})` : undefined}>
        {look === "photo" && <circle cx="62" cy="18" r="16" fill="#fff" opacity=".35" />}
        <path d="M14 100c2-20 12-30 26-30s24 10 26 30z" fill={p.shirt} />
        <rect x="35" y="56" width="10" height="12" rx="4" fill={p.skin} />
        <ellipse cx="40" cy="44" rx="17" ry="19" fill={p.skin} />
        <path d="M22 42c0-15 8-23 18-23s18 8 18 23c-3-7-10-10-18-10s-15 3-18 10z" fill={p.hair} />
        <circle cx="33" cy="46" r={eyes} fill="#2a241c" />
        <circle cx="47" cy="46" r={eyes} fill="#2a241c" />
        {look === "animated" && (
          <>
            <circle cx="34.4" cy="44.6" r="1.3" fill="#fff" />
            <circle cx="48.4" cy="44.6" r="1.3" fill="#fff" />
          </>
        )}
        <circle cx="29" cy="53" r="3" fill="#ff8f8f" opacity={look === "photo" ? 0.15 : 0.45} />
        <circle cx="51" cy="53" r="3" fill="#ff8f8f" opacity={look === "photo" ? 0.15 : 0.45} />
        <path d="M34 55c3.5 3 8.5 3 12 0" stroke="#b5533a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
