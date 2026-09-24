"use client";

/*
  Kniha v hero, kreslená kódom (CSS 3D) – namiesto videa. Obsah strán je
  súčasťou strany, takže sa pri otáčaní hýbe a tieňuje spolu s ňou („vytlačené
  v knihe“, nie text položený na video).

  Stavba (pohľad zhora na otvorenú knihu, chrbát v strede):
    L0  obálka     – predná strana = obálka, zadná = ľavá strana 1. dvojstrany (na doske)
    L1–L3 listy    – pravá strana dvojstrany k / ľavá strana dvojstrany k + 1
    L4  zadná doska – vrch = pravá strana 4. dvojstrany (na doske), spodok = zadná obálka
  Prechody časovej osi (BookHero): otvorenie obálky, 3 otočenia, zatvorenie
  (zadná doska sa preklopí doľava – na konci leží zatvorená kniha vľavo).

  Každý list sa otáča okolo chrbta vlastnou perspektívou; poradie vrstiev
  riadi z-index (spoľahlivejšie ako triedenie hĺbky v 3D). Rozmery vo vnútri
  sú v cqw šírky knihy – na mobile je kniha takmer na celú šírku.
*/

import Image from "next/image";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useState, type ReactNode } from "react";

import { STYLES } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import { HeroStyleShowcase } from "./HeroStyleShowcase";

import type { LandingCopy } from "@/content/landing";

export type BookState = { done: number; moving: number; t: number };

const PERSPECTIVE = "perspective(3200px)";
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Uhol listu i (0 = leží vpravo, −180 = leží vľavo). */
function angleOf(i: number, s: BookState) {
  if (i < s.done) return -180;
  if (i === s.moving) return -180 * smooth(s.t);
  return 0;
}

/** z-index: práve otáčaný navrchu, vpravo vyššie menšie indexy, vľavo vyššie väčšie. */
function layerOf(i: number, s: BookState) {
  if (i === s.moving) return 50;
  return angleOf(i, s) <= -90 ? 10 + i : 30 - i;
}

export function HeroBook({
  progress,
  stateAt,
  steps,
  coverTitle,
  label,
}: {
  progress: MotionValue<number>;
  stateAt: (p: number) => BookState;
  steps: LandingCopy["steps"];
  coverTitle: string;
  label: string;
}) {
  const state = useTransform(progress, stateAt);

  const [s1, s2, s3, s4] = steps;

  return (
    <div role="img" aria-label={label} className="absolute top-[8%] left-[3%] aspect-[1.3] w-[94%] [container-type:inline-size] md:top-[3.5%] md:left-[16%] md:w-[68%]">
      <Leaf index={0} state={state} board front={<Cover title={coverTitle} />} back={<StepLeft step={s1} page={1} />} />
      <Leaf index={1} state={state} front={<StepRight step={s1} page={2} art={<ArtChild />} />} back={<StepLeft step={s2} page={3} />} />
      <Leaf index={2} state={state} front={<StylePage state={state} text={s2.text} page={4} />} back={<StepLeft step={s3} page={5} />} />
      <Leaf index={3} state={state} front={<StepRight step={s3} page={6} art={<ArtStory />} />} back={<StepLeft step={s4} page={7} />} />
      <Leaf index={4} state={state} board front={<StepRight step={s4} page={8} art={<ArtBook />} />} back={<BackCover />} />
    </div>
  );
}

// ---------------------------------------------------------------- list

function Leaf({
  index,
  state,
  front,
  back,
  board = false,
}: {
  index: number;
  state: MotionValue<BookState>;
  front: ReactNode;
  back: ReactNode;
  /** Obálka / zadná doska: plná veľkosť, strana na nej je vsadená s oranžovým okrajom. */
  board?: boolean;
}) {
  const transform = useTransform(state, (s) => `${PERSPECTIVE} rotateY(${angleOf(index, s)}deg)`);
  const zIndex = useTransform(state, (s) => layerOf(index, s));
  // Tieň pri otáčaní: najtmavší, keď list stojí kolmo.
  const shade = useTransform(state, (s) => (s.moving === index ? Math.sin(smooth(s.t) * Math.PI) * 0.35 : 0));

  return (
    <motion.div
      aria-hidden
      className={
        "absolute origin-left [transform-style:preserve-3d] " +
        (board ? "top-0 bottom-0 left-1/2 w-1/2" : "top-[2.5%] bottom-[2.5%] left-1/2 w-[calc(50%-1.2%)]")
      }
      style={{ transform, zIndex }}
    >
      {/* Líce – leží vpravo */}
      <div className="absolute inset-0 [backface-visibility:hidden]">
        {board && index === 0 ? front : <PageFace side="right" board={board}>{front}</PageFace>}
        <motion.div className="pointer-events-none absolute inset-0 bg-linear-to-l from-black to-transparent" style={{ opacity: shade }} />
      </div>
      {/* Rub – po otočení leží vľavo */}
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        {board && index === 4 ? back : <PageFace side="left" board={board}>{back}</PageFace>}
        <motion.div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black to-transparent" style={{ opacity: shade }} />
      </div>
    </motion.div>
  );
}

/** Papier strany: krémová farba, tieň pri chrbte (väzba), jemná zrnitosť. */
function PageFace({ side, board, children }: { side: "left" | "right"; board: boolean; children: ReactNode }) {
  const paper = (
    <div
      className={
        "absolute bg-[#fbf6ea] " +
        (board
          ? side === "right"
            ? "top-[2.5%] bottom-[2.5%] left-0 right-[2.4%] rounded-r-[0.5cqw] shadow-[0.17cqw_0_0_#ebe2cf,0.33cqw_0_0_#ddd2ba,0.5cqw_0.08cqw_0_#cfc3a8]"
            : "top-[2.5%] bottom-[2.5%] right-0 left-[2.4%] rounded-l-[0.5cqw] shadow-[-0.17cqw_0_0_#ebe2cf,-0.33cqw_0_0_#ddd2ba,-0.5cqw_0.08cqw_0_#cfc3a8]"
          : "inset-0 " + (side === "right" ? "rounded-r-[0.5cqw]" : "rounded-l-[0.5cqw]"))
      }
    >
      <div className="absolute inset-0 overflow-hidden">{children}</div>
      {/* Väzba: strana sa pri chrbte zvažuje – tieň a mierny lesk */}
      <div
        className={
          "pointer-events-none absolute inset-y-0 w-[22%] mix-blend-multiply " +
          (side === "right"
            ? "left-0 bg-linear-to-r from-[#d9ccb2] via-[#efe6d4]/60 to-transparent"
            : "right-0 bg-linear-to-l from-[#d9ccb2] via-[#efe6d4]/60 to-transparent")
        }
      />
      <div
        className={
          "pointer-events-none absolute inset-y-0 w-[8%] opacity-60 " +
          (side === "right" ? "right-0 bg-linear-to-l from-[#e9dfcb] to-transparent" : "left-0 bg-linear-to-r from-[#e9dfcb] to-transparent")
        }
      />
    </div>
  );
  if (!board) return paper;
  return (
    <div className={"absolute inset-0 bg-brand-orange shadow-[0_1.33cqw_3.33cqw_-0.67cqw_rgb(23_20_15/0.35),0_0.33cqw_0.83cqw_rgb(23_20_15/0.15)] " + (side === "right" ? "rounded-r-[1cqw]" : "rounded-l-[1cqw]")}>
      {paper}
    </div>
  );
}

// ---------------------------------------------------------------- obsah strán

function StepLeft({ step, page }: { step: LandingCopy["steps"][number]; page: number }) {
  return (
    <div className="flex h-full flex-col justify-center px-[12%] pb-[10%] mix-blend-multiply">
      <span className="font-heading text-[7cqw] leading-none font-extrabold text-brand-orange">{step.number}</span>
      <p className="mt-[2cqw] font-heading text-[3.5cqw] leading-[1.12] font-extrabold text-balance text-[#2a241c]">{step.title}</p>
      <span className="mt-[2.33cqw] block h-[0.3cqw] w-[18%] rounded-full bg-brand-orange/50" />
      <PageNumber side="left">{page}</PageNumber>
    </div>
  );
}

function StepRight({ step, page, art }: { step: LandingCopy["steps"][number]; page: number; art: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2.67cqw] px-[13%] pb-[8%] mix-blend-multiply">
      <div className="w-[52%]">{art}</div>
      <p className="text-center text-[1.87cqw] leading-relaxed text-pretty text-[#3a3228]">{step.text}</p>
      <PageNumber side="right">{page}</PageNumber>
    </div>
  );
}

/** Pravá strana dvojstrany „Fotka“: fotka dieťaťa → ilustračné štýly (beží len keď je dvojstrana otvorená). */
function StylePage({ state, text, page }: { state: MotionValue<BookState>; text: string; page: number }) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  useMotionValueEvent(state, "change", (s) => setActive(s.done === 2 && s.moving === -1));
  const labels = {
    photo: t("common.progress.photo"),
    ...Object.fromEntries(STYLES.map((id) => [id, t(`style.${id}`)])),
  } as Parameters<typeof HeroStyleShowcase>[0]["labels"];
  return (
    <div className="relative h-full">
      <HeroStyleShowcase active={active} labels={labels} text={text} />
      <PageNumber side="right">{page}</PageNumber>
    </div>
  );
}

function PageNumber({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <span className={"absolute bottom-[5%] text-[1.25cqw] text-[#8a7f6d] " + (side === "left" ? "left-[10%]" : "right-[10%]")}>
      {children}
    </span>
  );
}

function Cover({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-r-[1cqw] bg-brand-orange shadow-[0_1.33cqw_3.33cqw_-0.67cqw_rgb(23_20_15/0.35),0_0.33cqw_0.83cqw_rgb(23_20_15/0.15)]">
      {/* textúra plátna + lesk */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_3px),repeating-linear-gradient(0deg,rgb(0_0_0/0.03)_0_1px,transparent_1px_3px)]" />
      <div className="absolute inset-0 bg-linear-to-br from-white/15 via-transparent to-black/10" />
      <div className="absolute inset-y-0 left-0 w-[5%] bg-linear-to-r from-black/20 to-transparent" />
      <div className="absolute inset-x-[14%] top-[22%] flex flex-col items-center text-center">
        <Star className="w-[18%] text-[#ffd8bf]" />
        <p className="mt-[2cqw] font-heading text-[3.67cqw] leading-tight font-extrabold text-[#fff4ec] [text-shadow:0_1px_0_rgb(0_0_0/0.18)]">
          {title}
        </p>
        <span className="mt-[1.67cqw] block h-[0.25cqw] w-[30%] rounded-full bg-[#ffd8bf]/70" />
      </div>
    </div>
  );
}

function BackCover() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-l-[1cqw] bg-brand-orange shadow-[0_1.33cqw_3.33cqw_-0.67cqw_rgb(23_20_15/0.35),0_0.33cqw_0.83cqw_rgb(23_20_15/0.15)]">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_3px),repeating-linear-gradient(0deg,rgb(0_0_0/0.03)_0_1px,transparent_1px_3px)]" />
      <div className="absolute inset-0 bg-linear-to-bl from-white/15 via-transparent to-black/10" />
      <div className="absolute inset-x-0 bottom-[10%] flex justify-center opacity-80 mix-blend-multiply">
        <Image src="/brand/taktik-logo.svg" alt="" width={81} height={72} unoptimized className="h-auto w-[16%] brightness-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ilustrácie (jednoduché, v štýle knihy)

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden>
      <path d="M24 4l5.6 12.2L43 18l-9.8 9.2L35.8 41 24 34.4 12.2 41l2.6-13.8L5 18l13.4-1.8z" />
    </svg>
  );
}

const art = "h-auto w-full";

function ArtChild() {
  return (
    <svg viewBox="0 0 120 100" className={art} aria-hidden>
      <circle cx="60" cy="52" r="34" fill="#ffe3cf" />
      <circle cx="60" cy="44" r="16" fill="#f6c9a6" />
      <path d="M44 42c0-12 8-18 16-18s16 6 16 18c-4-5-10-7-16-7s-12 2-16 7z" fill="#8a4b2a" />
      <circle cx="54" cy="46" r="1.8" fill="#2a241c" />
      <circle cx="66" cy="46" r="1.8" fill="#2a241c" />
      <path d="M55 52c3 2.5 7 2.5 10 0" stroke="#c0552a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M38 86c3-14 12-22 22-22s19 8 22 22" fill="#00a5a0" />
      <path d="M22 22l2.4 5 5.4.8-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.8zM98 16l1.8 3.8 4.2.6-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1-3-2.9 4.2-.6z" fill="#ff661a" />
    </svg>
  );
}

function ArtStory() {
  return (
    <svg viewBox="0 0 120 100" className={art} aria-hidden>
      <circle cx="88" cy="26" r="10" fill="#ffd166" />
      <path d="M10 84c18-14 34-18 50-10s32 4 50-8v18H10z" fill="#bfe3c9" />
      <rect x="40" y="38" width="36" height="40" fill="#ffe3cf" />
      <path d="M36 40l22-18 22 18z" fill="#ff661a" />
      <rect x="52" y="58" width="12" height="20" rx="6" fill="#5e3f61" />
      <rect x="44" y="46" width="8" height="8" rx="1.5" fill="#fff" />
      <rect x="64" y="46" width="8" height="8" rx="1.5" fill="#fff" />
      <path d="M58 22v-10l10 4-10 4" fill="#00a5a0" />
      <path d="M18 30l1.6 3.4 3.8.5-2.8 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="#ff661a" />
    </svg>
  );
}

function ArtBook() {
  return (
    <svg viewBox="0 0 120 100" className={art} aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="5" fill="#e6ddc9" />
      <path d="M22 30c14-6 26-6 38 2v50c-12-8-24-8-38-2z" fill="#ff661a" />
      <path d="M98 30c-14-6-26-6-38 2v50c12-8 24-8 38-2z" fill="#ff8a4d" />
      <path d="M28 36c10-3 19-3 28 2v38c-9-5-18-5-28-2z" fill="#fff" opacity=".9" />
      <path d="M92 36c-10-3-19-3-28 2v38c9-5 18-5 28-2z" fill="#fff" opacity=".9" />
      <path d="M60 32v50" stroke="#c0552a" strokeWidth="2" />
      <path d="M74 20h8v18l-4-3-4 3z" fill="#00a5a0" />
      <path d="M100 14l1.6 3.4 3.8.5-2.8 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.8-2.6 3.8-.5zM16 18l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4z" fill="#ffd166" />
    </svg>
  );
}
