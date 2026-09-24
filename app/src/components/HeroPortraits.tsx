"use client";

/*
  Ilustračný portrét dieťaťa pre ukážku štýlov v hero (dvojstrana „Fotka“):
  to isté dievčatko (mikádo s ofinou, pehy, sponka s hviezdičkou, tyrkysové
  tričko) nakreslené v podobe fotky a v štyroch štýloch konfigurátora.
  Vektorová zástupná ilustrácia – skutočné obrázky (vygenerované našimi
  štýlmi) ju nahradia cez HERO_STYLE_IMAGES.
*/

import { useId } from "react";

import type { StyleId } from "@/config/catalog";

export type Look = "photo" | StyleId;

// Spoločná kresba (viewBox 200 × 250) – vo všetkých štýloch rovnaké dieťa.
const SHAPE = {
  shirt: "M26 250C30 204 60 186 100 186s70 18 74 64z",
  collar: "M78 190q22 18 44 0l-4 10q-18 12-36 0z",
  neck: "M86 158h28v34q-14 8-28 0z",
  hairBack: "M44 118C40 68 64 44 100 44s60 24 56 74c0 22-5 38-10 46l-5-38c-2-24-14-36-41-36s-39 12-41 36l-5 38c-5-8-10-24-10-46z",
  bangs: "M55 106c1-30 20-48 45-48s44 18 45 48c-8-4-15-12-19-20-8 10-24 16-40 14-12-1-22-4-31 6z",
  mouth: "M86 146q14 13 28 0",
  mouthOpen: "M85 145q15 17 30 0q-15 5-30 0z",
  brows: "M73 101q9-5 18-1M109 100q9-4 18 1",
  nose: "M97 131q3 3 6 0",
} as const;

const HEAD = { cx: 100, cy: 114, rx: 49, ry: 55 };
const EYES = [82, 118] as const;
const FRECKLES = [
  [74, 134], [79, 131], [84, 135], [116, 135], [121, 131], [126, 134],
] as const;

export function StylePortrait({ look }: { look: Look }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  if (look === "photo") return <Photo id={id} url={url} />;
  if (look === "watercolor") return <Watercolor id={id} url={url} />;
  if (look === "modern") return <Modern />;
  if (look === "animated") return <Animated id={id} url={url} />;
  return <Crayon id={id} url={url} />;
}

type Ids = { id: (n: string) => string; url: (n: string) => string };
const svgProps = { viewBox: "0 0 200 250", className: "h-full w-full", "aria-hidden": true, preserveAspectRatio: "xMidYMid slice" } as const;

// ---------------------------------------------------------------- fotka

function Photo({ id, url }: Ids) {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id={id("bg")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8b6" />
          <stop offset=".55" stopColor="#a9be93" />
          <stop offset="1" stopColor="#7f9670" />
        </linearGradient>
        <filter id={id("bokeh")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id={id("skin")} cx=".42" cy=".38" r=".7">
          <stop offset="0" stopColor="#f8d9bf" />
          <stop offset=".6" stopColor="#ecbc98" />
          <stop offset="1" stopColor="#cf9573" />
        </radialGradient>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a5a38" />
          <stop offset=".45" stopColor="#6b4128" />
          <stop offset="1" stopColor="#4a2b19" />
        </linearGradient>
        <linearGradient id={id("shirt")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fb3ad" />
          <stop offset="1" stopColor="#2c7f7a" />
        </linearGradient>
        <radialGradient id={id("iris")}>
          <stop offset="0" stopColor="#2b1a10" />
          <stop offset=".55" stopColor="#5a3a22" />
          <stop offset="1" stopColor="#3a2415" />
        </radialGradient>
        <filter id={id("soft")}>
          <feGaussianBlur stdDeviation=".45" />
        </filter>
        <filter id={id("grain")}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="200" height="250" fill={url("bg")} />
      {/* rozmazané pozadie záhrady */}
      <g filter={url("bokeh")} opacity=".8">
        <circle cx="26" cy="40" r="22" fill="#eef3d9" />
        <circle cx="170" cy="30" r="26" fill="#f6f1dc" />
        <circle cx="180" cy="120" r="18" fill="#dbe8c4" />
        <circle cx="16" cy="140" r="16" fill="#e7efcf" />
        <circle cx="150" cy="80" r="10" fill="#ffffff" />
      </g>
      <g filter={url("soft")}>
        <path d={SHAPE.hairBack} fill={url("hair")} />
        <path d={SHAPE.shirt} fill={url("shirt")} />
        <path d={SHAPE.collar} fill="#e9f5f3" opacity=".9" />
        <path d={SHAPE.neck} fill="#d9a27f" />
        <ellipse cx="100" cy="164" rx="17" ry="5" fill="#9c6a4c" opacity=".22" />
        <ellipse cx="51" cy="120" rx="8" ry="11" fill="#e3ab88" />
        <ellipse cx="149" cy="120" rx="8" ry="11" fill="#e3ab88" />
        <ellipse {...HEAD} fill={url("skin")} />
        <path d={SHAPE.bangs} fill={url("hair")} />
        <path d="M66 80q20-18 46-16" stroke="#a9774f" strokeWidth="3" fill="none" opacity=".5" strokeLinecap="round" />
        <path d={SHAPE.brows} stroke="#5a3a24" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
        {EYES.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="118" rx="7.5" ry="5.5" fill="#fbf7f2" />
            <circle cx={x} cy="118" r="4.6" fill={url("iris")} />
            <circle cx={x} cy="118" r="2" fill="#120a05" />
            <circle cx={x + 1.6} cy="116.4" r="1.2" fill="#fff" />
            <path d={`M${x - 8} 115q8-6 16 0`} stroke="#3a2415" strokeWidth="1.6" fill="none" />
          </g>
        ))}
        <path d={SHAPE.nose} stroke="#b87c5c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={SHAPE.mouthOpen} fill="#b8534a" />
        <path d="M89 146q11 5 22 0" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".85" />
        <circle cx="76" cy="140" r="9" fill="#f08f86" opacity=".22" />
        <circle cx="124" cy="140" r="9" fill="#f08f86" opacity=".22" />
        {FRECKLES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r=".9" fill="#a8674a" opacity=".55" />
        ))}
        <path d="M62 98l3 5 5 .5-4 3.5 1 5-5-2.6-5 2.6 1-5-4-3.5 5-.5z" fill="#ffcf4a" />
      </g>
      <rect width="200" height="250" filter={url("grain")} opacity=".08" />
      <rect width="200" height="250" fill="#fff5e6" opacity=".06" />
    </svg>
  );
}

// ---------------------------------------------------------------- akvarel

function Watercolor({ id, url }: Ids) {
  return (
    <svg {...svgProps}>
      <defs>
        <filter id={id("wash")} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="7" />
          <feGaussianBlur stdDeviation=".8" />
        </filter>
        <filter id={id("ink")}>
          <feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id={id("paper")}>
          <feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" seed="2" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="200" height="250" fill="#fbf6ec" />
      <rect width="200" height="250" filter={url("paper")} opacity=".07" />
      {/* farebné škvrny pozadia */}
      <g filter={url("wash")} style={{ mixBlendMode: "multiply" }}>
        <ellipse cx="18" cy="30" rx="34" ry="26" fill="#bfe3e0" opacity=".7" />
        <ellipse cx="186" cy="52" rx="30" ry="24" fill="#ffd9c2" opacity=".7" />
        <ellipse cx="188" cy="176" rx="22" ry="20" fill="#e8d9f2" opacity=".6" />
      </g>
      <g filter={url("wash")} style={{ mixBlendMode: "multiply" }}>
        <path d={SHAPE.hairBack} fill="#b77a4f" opacity=".8" />
        <path d={SHAPE.shirt} fill="#6cc3bd" opacity=".8" />
        <path d={SHAPE.neck} fill="#f2c4a2" opacity=".9" />
        <ellipse {...HEAD} fill="#f8d5b8" opacity=".92" />
        <ellipse cx="51" cy="120" rx="8" ry="11" fill="#f2c4a2" />
        <ellipse cx="149" cy="120" rx="8" ry="11" fill="#f2c4a2" />
        <path d={SHAPE.bangs} fill="#a86a42" opacity=".85" />
        <circle cx="76" cy="140" r="10" fill="#f59a94" opacity=".35" />
        <circle cx="124" cy="140" r="10" fill="#f59a94" opacity=".35" />
      </g>
      {/* tušová linka */}
      <g filter={url("ink")} stroke="#7a4e34" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".75">
        <ellipse {...HEAD} />
        <path d={SHAPE.bangs} />
        <path d={SHAPE.brows} />
        <path d={SHAPE.nose} />
        <path d={SHAPE.mouth} strokeWidth="1.8" />
        <path d="M60 196q40 22 80 0" />
      </g>
      {EYES.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="118" rx="4" ry="4.6" fill="#4a3022" />
          <circle cx={x + 1.3} cy="116.6" r="1.1" fill="#fff" />
        </g>
      ))}
      {FRECKLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#b77a4f" opacity=".6" />
      ))}
      <path d="M62 98l3 5 5 .5-4 3.5 1 5-5-2.6-5 2.6 1-5-4-3.5 5-.5z" fill="#ffd166" opacity=".9" />
    </svg>
  );
}

// ---------------------------------------------------------------- moderná (plochá) ilustrácia

function Modern() {
  return (
    <svg {...svgProps}>
      <rect width="200" height="250" fill="#ffe6d3" />
      <circle cx="100" cy="118" r="82" fill="#ffb68a" />
      <rect x="18" y="26" width="26" height="26" rx="6" fill="#00a5a0" transform="rotate(14 31 39)" />
      <circle cx="170" cy="46" r="10" fill="#5e3f61" />
      <path d="M160 190l14-24 14 24z" fill="#ffd166" />
      <path d={SHAPE.hairBack} fill="#3b2419" />
      <path d={SHAPE.shirt} fill="#00a5a0" />
      <path d="M100 186c40 0 70 18 74 64h-74z" fill="#008f8a" />
      <path d={SHAPE.collar} fill="#ffffff" />
      <path d={SHAPE.neck} fill="#e0a37d" />
      <ellipse cx="51" cy="120" rx="8" ry="11" fill="#eeb48e" />
      <ellipse cx="149" cy="120" rx="8" ry="11" fill="#eeb48e" />
      <ellipse {...HEAD} fill="#f5c6a0" />
      <path d="M100 59c27 0 49 25 49 55s-22 55-49 55z" fill="#eeb68f" opacity=".45" />
      <path d={SHAPE.bangs} fill="#3b2419" />
      <path d={SHAPE.brows} stroke="#3b2419" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {EYES.map((x) => (
        <circle key={x} cx={x} cy="118" r="4.2" fill="#1f140e" />
      ))}
      <path d={SHAPE.nose} stroke="#c9825d" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={SHAPE.mouthOpen} fill="#1f140e" />
      <path d="M90 147q10 4 20 0v2q-10 4-20 0z" fill="#fff" />
      <circle cx="76" cy="138" r="7" fill="#ff8f7a" />
      <circle cx="124" cy="138" r="7" fill="#ff8f7a" />
      <path d="M62 98l3 5 5 .5-4 3.5 1 5-5-2.6-5 2.6 1-5-4-3.5 5-.5z" fill="#ffd166" />
    </svg>
  );
}

// ---------------------------------------------------------------- animovaný film

function Animated({ id, url }: Ids) {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe2ff" />
          <stop offset="1" stopColor="#f3e3ff" />
        </linearGradient>
        <radialGradient id={id("skin")} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor="#ffe3cc" />
          <stop offset=".65" stopColor="#f7bf98" />
          <stop offset="1" stopColor="#dd8f6a" />
        </radialGradient>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a4633a" />
          <stop offset="1" stopColor="#5c321c" />
        </linearGradient>
        <radialGradient id={id("iris")} cx=".45" cy=".4">
          <stop offset="0" stopColor="#8fd3ff" />
          <stop offset=".6" stopColor="#3b7fbf" />
          <stop offset="1" stopColor="#1d3f63" />
        </radialGradient>
        <linearGradient id={id("shirt")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#55d0c9" />
          <stop offset="1" stopColor="#1f8f89" />
        </linearGradient>
      </defs>
      <rect width="200" height="250" fill={url("sky")} />
      <circle cx="164" cy="42" r="30" fill="#fff" opacity=".6" />
      <path d={SHAPE.hairBack} fill={url("hair")} />
      <path d={SHAPE.shirt} fill={url("shirt")} />
      <path d={SHAPE.neck} fill="#e8a27e" />
      <ellipse cx="50" cy="120" rx="10" ry="13" fill="#f2b38e" />
      <ellipse cx="150" cy="120" rx="10" ry="13" fill="#f2b38e" />
      <ellipse cx="100" cy="116" rx="52" ry="54" fill={url("skin")} />
      {/* obrys svetla (rim light) */}
      <path d="M140 84q16 24 6 58" stroke="#fff" strokeWidth="3" fill="none" opacity=".55" strokeLinecap="round" />
      <path d={SHAPE.bangs} fill={url("hair")} />
      <path d="M70 76q24-20 54-12" stroke="#d99a6a" strokeWidth="4" fill="none" opacity=".7" strokeLinecap="round" />
      <path d="M72 97q9-5 18-1M110 96q9-4 18 1" stroke="#6a3a20" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {EYES.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="120" rx="11" ry="13" fill="#fff" />
          <circle cx={x} cy="122" r="8.5" fill={url("iris")} />
          <circle cx={x} cy="122" r="4.2" fill="#0d1b2a" />
          <circle cx={x + 3} cy="118" r="2.6" fill="#fff" />
          <circle cx={x - 3} cy="126" r="1.2" fill="#fff" opacity=".8" />
        </g>
      ))}
      <ellipse cx="100" cy="136" rx="4" ry="3" fill="#e79a78" />
      <path d="M84 148q16 18 32 0q-16 6-32 0z" fill="#8a2f2a" />
      <path d="M90 153q10 6 20 0" stroke="#ff8f8f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="72" cy="142" r="10" fill="#ff8f8f" opacity=".45" />
      <circle cx="128" cy="142" r="10" fill="#ff8f8f" opacity=".45" />
      {FRECKLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x > 100 ? x + 3 : x - 3} cy={y + 4} r="1" fill="#c9764f" opacity=".6" />
      ))}
      <path d="M60 96l3.6 6 6 .6-4.6 4 1.2 6-6-3-6 3 1.2-6-4.6-4 6-.6z" fill="#ffd84a" stroke="#f0a500" strokeWidth=".8" />
    </svg>
  );
}

// ---------------------------------------------------------------- pastelky

function Crayon({ id, url }: Ids) {
  return (
    <svg {...svgProps}>
      <defs>
        {/* zrnitá textúra pasteliek: farba len tam, kde šum „chytí“ papier */}
        <filter id={id("tex")}>
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="t" />
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="w" />
          <feDisplacementMap in="t" in2="w" scale="3" />
        </filter>
        <filter id={id("line")}>
          <feTurbulence type="fractalNoise" baseFrequency=".25" numOctaves="2" seed="6" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        <pattern id={id("hatch")} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffb703" strokeWidth="2.4" opacity=".55" />
        </pattern>
      </defs>
      <rect width="200" height="250" fill="#fffaf0" />
      <rect width="200" height="250" fill={url("hatch")} opacity=".35" />
      <g filter={url("tex")}>
        <path d={SHAPE.hairBack} fill="#b5652f" />
        <path d={SHAPE.shirt} fill="#2ec4b6" />
        <path d={SHAPE.neck} fill="#f6c39c" />
        <ellipse {...HEAD} fill="#fcd2b0" />
        <ellipse cx="51" cy="120" rx="8" ry="11" fill="#f6c39c" />
        <ellipse cx="149" cy="120" rx="8" ry="11" fill="#f6c39c" />
        <path d={SHAPE.bangs} fill="#a0522d" />
        <circle cx="76" cy="140" r="9" fill="#ff6b6b" opacity=".7" />
        <circle cx="124" cy="140" r="9" fill="#ff6b6b" opacity=".7" />
        <path d="M62 98l3 5 5 .5-4 3.5 1 5-5-2.6-5 2.6 1-5-4-3.5 5-.5z" fill="#ffd166" />
      </g>
      <g filter={url("line")} stroke="#3b2a20" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse {...HEAD} />
        <path d={SHAPE.bangs} />
        <path d={SHAPE.hairBack} strokeWidth="2" />
        <path d={SHAPE.shirt} strokeWidth="2.2" />
        <path d={SHAPE.brows} />
        <path d={SHAPE.nose} strokeWidth="2" />
        <path d={SHAPE.mouth} strokeWidth="3" />
        {EYES.map((x) => (
          <circle key={x} cx={x} cy="118" r="3.4" fill="#3b2a20" />
        ))}
      </g>
      {FRECKLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="#8b4513" opacity=".7" />
      ))}
    </svg>
  );
}
