"use client";

/*
  Interaktívne pravé strany knihy v hero (vedľa strany „Fotka“ – HeroStyleShowcase):

    01 Dieťa   – meno sa napíše ako na písacom stroji a pod ním sa hneď vyskloňuje
                 v troch vetách z knihy (tvary zo slovníka mien, nie ručne); mená sa
                 striedajú, čipy dievča / chlapec prepnú na ďalšie meno.
    03 Príbeh  – vejár obálok s menom v názve; predná sa strieda, ťuknutie ju vytiahne,
                 posledná karta je „na mieru“.
    04 Náhľad  – knižka sa sama listuje s vodoznakom, „Páči sa mi“ vodoznak zotrie
                 a objaví sa pečiatka „Schválené“ (platí sa až po náhľade).

  Každá strana beží len kým je jej dvojstrana otvorená (active) a pri otáčaní stojí;
  pri obmedzení animácií ukáže pokojný koncový stav. Knihu číta čítačka zo zoznamu
  krokov v BookHero, strany sú aria-hidden (tlačidlá majú tabIndex -1 ako vo Fotke).
  Pohyb: krivky a pružiny z lib/motion, nástup = priehľadnosť + posun, postupne.
*/

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LandingCopy } from "@/content/landing";
import { useI18n } from "@/i18n/client";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";
import { pluralForm } from "@/i18n/plural";
import { guessNameForms, renderNameTokens, type Gender, type NameContext } from "@/lib/language";
import { SEED_NAMES } from "@/lib/language/seed-names";
import { EASE, SPRING } from "@/lib/motion";
import { StylePortrait } from "./HeroPortraits";
import { ArrowRightIcon, CheckIcon, PlusIcon } from "./icons";
import { useTypewriter } from "./HeroStyleShowcase";

type Pages = LandingCopy["pages"];

/** Tvary ukážkového mena: zo slovníka (overené), inak pravidlá jazykového modulu. */
function nameContext(name: string, gender: Gender, language: BookLanguage): NameContext {
  const seed = SEED_NAMES.find((s) => s.language === language && s.forms.N === name);
  if (seed) return { forms: seed.forms, gender: seed.gender, declinable: seed.declinable ?? true };
  const guess = guessNameForms(name, gender, language);
  return { forms: guess.forms, gender, declinable: guess.declinable };
}

/** Vyznačí v texte vyskloňované meno (všetky jeho tvary). */
function highlight(text: string, forms: string[]) {
  const unique = [...new Set(forms)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${unique.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    unique.includes(part) ? (
      <mark key={i} className="rounded-[0.3cqw] bg-brand-orange/15 px-[0.2cqw] text-brand-orange-dark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const chip = (on: boolean) =>
  "rounded-full px-[1.4cqw] py-[0.6cqw] text-[1.25cqw] font-semibold transition-colors " +
  (on ? "bg-brand-orange text-white" : "bg-white/70 text-[#3a3228] ring-1 ring-[#d9cfb8] hover:bg-white");

// ---------------------------------------------------------------- 01 Dieťa

const SAMPLES = ["child.check.sample1", "child.check.sample2", "child.check.sample3"] as const satisfies readonly MessageKey[];
/** Prvá zmena hneď po dopadnutí strany (statické strany ľudia preskakujú), ďalšie rýchlejšie. */
const NAME_FIRST_MS = 300;
const NAME_HOLD_MS = 2200;

export function HeroNameShowcase({ active, copy, text }: { active: boolean; copy: Pages["child"]; text: string }) {
  const { t, language } = useI18n();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [fresh, setFresh] = useState(true);
  const current = copy.names[index];
  const typed = useTypewriter(current.name, !reduce);
  const done = typed === current.name;
  const ctx = useMemo(() => nameContext(current.name, current.gender, language), [current, language]);
  const bookT = useMemo(() => createTranslator(language), [language]);

  // Po dopísaní a prečítaní viet ďalšie meno – len kým je dvojstrana otvorená.
  useEffect(() => {
    if (!active || reduce || !done) return;
    const timer = window.setTimeout(() => {
      setFresh(false);
      setIndex((i) => (i + 1) % copy.names.length);
    }, fresh ? NAME_FIRST_MS : NAME_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduce, done, fresh, copy.names.length]);

  // Zatvorená dvojstrana: nabudúce od prvého mena.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setIndex(0);
      setFresh(true);
    }
  }

  // Čip pohlavia prepne na najbližšie meno s daným rodom.
  const pick = (gender: Gender) => {
    if (current.gender === gender) return;
    for (let k = 1; k <= copy.names.length; k++) {
      const next = (index + k) % copy.names.length;
      if (copy.names[next].gender === gender) return setIndex(next);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2cqw] px-[9%] pb-[9%]">
      <div className="w-[78%]">
        <p className="mb-[0.6cqw] text-[1.15cqw] font-semibold tracking-wide text-[#8a7f6d] uppercase">{copy.field}</p>
        <div className="flex h-[4.4cqw] items-center rounded-[1cqw] bg-white px-[1.4cqw] shadow-[inset_0_0.1cqw_0.3cqw_rgb(23_20_15/0.08)] ring-[0.15cqw] ring-brand-orange/60">
          <span className="font-heading text-[2.3cqw] font-extrabold text-[#2a241c]">{typed}</span>
          <span aria-hidden className="ml-[0.2cqw] inline-block h-[2.3cqw] w-[0.25cqw] animate-pulse bg-brand-orange" />
        </div>
        <div className="mt-[1.2cqw] flex flex-wrap gap-[0.8cqw]">
          {(["girl", "boy"] as const).map((g) => (
            <button key={g} type="button" tabIndex={-1} onClick={() => pick(g)} className={chip(current.gender === g)}>
              {g === "girl" ? copy.girl : copy.boy}
            </button>
          ))}
          <span className={chip(false) + " pointer-events-none"}>{t(`configurator.age.years.${pluralForm(current.age)}`, { n: current.age })}</span>
        </div>
      </div>

      {/* Vety z knihy – nastúpia postupne, až keď je meno dopísané. */}
      <ul className="flex min-h-[11cqw] w-[78%] flex-col justify-center gap-[0.8cqw] rounded-[1.2cqw] bg-white/60 px-[1.6cqw] py-[1.2cqw] ring-1 ring-[#e6dcc6]">
        <AnimatePresence mode="popLayout">
          {(done || reduce) &&
            SAMPLES.map((key, i) => (
              <motion.li
                key={`${current.name}-${key}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE.out, delay: i * 0.07 } }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE.in } }}
                className="font-heading text-[1.7cqw] leading-snug text-[#2a241c]"
              >
                „{highlight(bookT(key, undefined, ctx), Object.values(ctx.forms))}“
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>

      <p className="text-center text-[1.75cqw] leading-relaxed text-pretty text-[#3a3228] mix-blend-multiply">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------- 03 Príbeh

const COVER_COLORS = ["#3f7d34", "#5e3f61", "#00a5a0"];
const STORY_FIRST_MS = 400;
const STORY_HOLD_MS = 1500;

export function HeroStoryShowcase({ active, copy, text }: { active: boolean; copy: Pages["story"]; text: string }) {
  const { language } = useI18n();
  const reduce = useReducedMotion();
  const ctx = useMemo(() => nameContext(copy.hero, copy.heroGender, language), [copy.hero, copy.heroGender, language]);
  const titles = copy.titles.map((title) => renderNameTokens(title, ctx));
  const count = titles.length + 1; // + karta „na mieru“
  const [front, setFront] = useState(0);
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (!active || reduce) return;
    const timer = window.setTimeout(() => {
      setFresh(false);
      setFront((f) => (f + 1) % count);
    }, fresh ? STORY_FIRST_MS : STORY_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduce, front, fresh, count]);

  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setFront(0);
      setFresh(true);
    }
  }

  const custom = front === titles.length;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[1.8cqw] px-[8%] pb-[9%]">
      {/* Vejár: predná karta hore a rovno, ostatné pootočené do strán. */}
      <div className="relative h-[21cqw] w-full">
        {Array.from({ length: count }, (_, i) => {
          const offset = ((i - front + count) % count) as number; // 0 = vpredu
          const side = offset === 0 ? 0 : offset <= count / 2 ? offset : offset - count;
          const isCustom = i === titles.length;
          return (
            <motion.button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => setFront(i)}
              animate={{
                x: `${side * 42}%`,
                y: offset === 0 ? "-4%" : `${Math.abs(side) * 5}%`,
                rotate: side * 9,
                scale: offset === 0 ? 1.06 : 0.92,
                zIndex: 10 - Math.abs(side) * 2 - (offset === 0 ? -5 : 0),
              }}
              transition={reduce ? { duration: 0 } : SPRING.smooth}
              className={
                "absolute top-0 left-1/2 -ml-[7.5cqw] flex h-[20cqw] w-[15cqw] flex-col justify-end overflow-hidden rounded-[1cqw] p-[1.2cqw] text-left shadow-[0_0.8cqw_1.6cqw_-0.5cqw_rgb(23_20_15/0.35)] " +
                (isCustom ? "border-[0.2cqw] border-dashed border-brand-orange bg-[#fff6ef]" : "")
              }
              style={isCustom ? undefined : { backgroundColor: COVER_COLORS[i % COVER_COLORS.length] }}
            >
              {isCustom ? (
                <>
                  <span aria-hidden className="mb-auto flex size-[4cqw] items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange-dark">
                    <PlusIcon className="size-[2.2cqw]" />
                  </span>
                  <span className="font-heading text-[1.55cqw] leading-tight font-extrabold text-[#2a241c]">{copy.custom}</span>
                </>
              ) : (
                <>
                  <span className="absolute top-[0.9cqw] right-[0.9cqw] size-[7cqw] overflow-hidden rounded-full ring-[0.3cqw] ring-white/70">
                    <StylePortrait look="watercolor" />
                  </span>
                  <span className="font-heading text-[1.55cqw] leading-tight font-extrabold text-white drop-shadow">{titles[i]}</span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Názov prednej karty a údaje – prepíšu sa s kartou. */}
      <div className="flex h-[5cqw] flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={front}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15, ease: EASE.in } }}
          >
            <p className="font-heading text-[2cqw] font-extrabold text-[#2a241c]">{custom ? copy.custom : titles[front]}</p>
            <p className="text-[1.3cqw] text-[#8a7f6d]">{custom ? copy.customNote : copy.meta}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-[1.75cqw] leading-relaxed text-pretty text-[#3a3228] mix-blend-multiply">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------- 04 Náhľad

/** Ukážkové dvojstrany: farba scény a dĺžky riadkov textu (bez skutočného obsahu). */
const MINI_SPREADS = [
  { sky: "#cfe8f3", ground: "#bfe3c9", sun: "#ffd166", lines: [92, 80, 86, 60] },
  { sky: "#f6dcc8", ground: "#e8c9a0", sun: "#ff9a6a", lines: [88, 94, 70] },
  { sky: "#dcd3ec", ground: "#c9e0c3", sun: "#fff2b3", lines: [90, 76, 84, 52] },
];
/** Prvé otočenie hneď po dopadnutí strany, ďalšie rýchlejšie. */
const FLIP_FIRST_MS = 450;
const FLIP_WAIT_MS = 850;

function MiniScene({ spread, portrait }: { spread: (typeof MINI_SPREADS)[number]; portrait?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: spread.sky }}>
      <span className="absolute top-[12%] right-[14%] aspect-square w-[18%] rounded-full" style={{ backgroundColor: spread.sun }} />
      <span className="absolute inset-x-[-10%] bottom-[-18%] h-[48%] rounded-[50%]" style={{ backgroundColor: spread.ground }} />
      {portrait && (
        <span className="absolute bottom-[10%] left-[18%] w-[42%] overflow-hidden rounded-full ring-[0.2cqw] ring-white/80">
          <StylePortrait look="watercolor" />
        </span>
      )}
    </div>
  );
}

function MiniText({ spread }: { spread: (typeof MINI_SPREADS)[number] }) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-[0.7cqw] bg-[#fffdf7] px-[12%]">
      {spread.lines.map((w, i) => (
        <span key={i} className="h-[0.55cqw] rounded-full bg-[#d9cfb8]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function HeroPreviewShowcase({ active, copy, text }: { active: boolean; copy: Pages["preview"]; text: string }) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [spread, setSpread] = useState(0);
  // Otáčaný list: pravá strana predchádzajúcej dvojstrany sa sklopí k chrbtu, ľavá novej sa rozloží.
  const [turn, setTurn] = useState<{ from: number; phase: "out" | "in" } | null>(null);
  const [approved, setApproved] = useState(false);
  const running = useRef(false);
  const activeRef = useRef(active);

  // Vrstvy otáčaného listu sú vykreslené stále (skryté) – animácia má vždy prvok.
  const flipTo = async (next: number) => {
    const from = spread;
    setTurn({ from, phase: "out" });
    await new Promise((r) => requestAnimationFrame(r));
    await animate("[data-turn-out]", { scaleX: [1, 0] }, { duration: 0.24, ease: EASE.in });
    setSpread(next);
    setTurn({ from, phase: "in" });
    await new Promise((r) => requestAnimationFrame(r));
    await animate("[data-turn-in]", { scaleX: [0, 1] }, { duration: 0.26, ease: EASE.out });
    setTurn(null);
  };

  const approve = async () => {
    if (approved) return;
    setApproved(true);
    if (reduce) return;
    await animate("[data-watermark]", { clipPath: ["inset(0 0% 0 0)", "inset(0 0% 0 100%)"] }, { duration: 0.7, ease: EASE.inOut });
  };

  // Jeden obeh: listovanie → „Páči sa mi“ → pečiatka → pauza → od začiatku.
  const runRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    runRef.current = async () => {
      if (running.current) return;
      running.current = true;
      const alive = () => activeRef.current;
      const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
      for (let i = 1; i < MINI_SPREADS.length && alive(); i++) {
        await wait(i === 1 ? FLIP_FIRST_MS : FLIP_WAIT_MS);
        if (alive()) await flipTo(i);
      }
      if (alive()) await wait(450);
      if (alive()) {
        await animate("[data-like]", { scale: [1, 0.92, 1.04, 1] }, { duration: 0.4, ease: EASE.out });
        await approve();
      }
      if (alive()) await wait(1700);
      running.current = false;
      if (alive()) {
        setApproved(false);
        setSpread(0);
        await animate("[data-watermark]", { clipPath: "inset(0 0% 0 0)" }, { duration: 0 });
        runRef.current();
      }
    };
  });

  useEffect(() => {
    activeRef.current = active;
    if (active && !reduce) runRef.current();
  }, [active, reduce]);

  // Zatvorená dvojstrana: nabudúce od prvej strany, s vodoznakom.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setSpread(0);
      setApproved(false);
      setTurn(null);
    }
  }

  const leftOf = (i: number) => <MiniScene spread={MINI_SPREADS[i]} portrait={i === 0} />;
  const rightOf = (i: number) => <MiniText spread={MINI_SPREADS[i]} />;
  const shownLeft = turn ? turn.from : spread;

  return (
    <div ref={scope} className="flex h-full flex-col items-center justify-center gap-[2cqw] px-[8%] pb-[9%]">
      <div className="relative w-[92%]">
        {/* Knižka (2D „otáčanie“ – vnorené 3D v 3D liste by sa v Chrome rozbilo). */}
        <div className="relative flex aspect-[2/1.3] overflow-hidden rounded-[0.8cqw] shadow-[0_0.8cqw_1.8cqw_-0.6cqw_rgb(23_20_15/0.35)] ring-1 ring-[#e0d5bf]">
          <div className="relative h-full w-1/2">
            {leftOf(shownLeft)}
            <div data-turn-in className="absolute inset-0 origin-right" style={{ transform: "scaleX(0)", visibility: turn?.phase === "in" ? "visible" : "hidden" }}>
              {leftOf(spread)}
            </div>
          </div>
          <div className="relative h-full w-1/2">
            {rightOf(spread)}
            <div data-turn-out className="absolute inset-0 origin-left" style={{ visibility: turn?.phase === "out" ? "visible" : "hidden" }}>
              {rightOf(turn?.from ?? spread)}
              <span className="absolute inset-0 bg-linear-to-l from-black/15 to-transparent" />
            </div>
          </div>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-[6%] -translate-x-1/2 bg-linear-to-r from-transparent via-black/10 to-transparent" />
          {/* Vodoznak cez celý náhľad – po „Páči sa mi“ sa zotrie. */}
          {/* Vodoznak je vykreslený stále (animácia zotretia potrebuje prvok); pri obmedzení animácií sa len skryje. */}
          <div data-watermark aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-[3cqw] gap-y-[2cqw] overflow-hidden" style={{ clipPath: "inset(0 0% 0 0)", visibility: approved && reduce ? "hidden" : "visible" }}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="-rotate-[22deg] font-heading text-[2.4cqw] font-extrabold tracking-wider text-brand-orange/35">
                  {copy.watermark}
                </span>
              ))}
            </div>
        </div>

        {/* Pečiatka „Schválené“. */}
        <AnimatePresence>
          {approved && (
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 1.8, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: -8, transition: reduce ? { duration: 0 } : SPRING.bouncy }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: EASE.in } }}
              className="absolute -top-[1.6cqw] -right-[1.4cqw] rounded-[0.8cqw] border-[0.3cqw] border-[#1f7a3a] bg-white/90 px-[1.2cqw] py-[0.5cqw] font-heading text-[1.7cqw] font-extrabold tracking-wide text-[#1f7a3a] uppercase shadow-sm"
            >
              <CheckIcon className="-mt-[0.2cqw] mr-[0.4cqw] inline size-[1.8cqw]" />
              {copy.approved}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <button
        data-like
        type="button"
        tabIndex={-1}
        onClick={approve}
        className={
          "flex items-center gap-[0.8cqw] rounded-full py-[0.7cqw] pr-[0.7cqw] pl-[1.8cqw] text-[1.4cqw] font-semibold transition-colors " +
          (approved ? "bg-[#1f7a3a] text-white" : "bg-brand-orange/15 text-[#2a241c] hover:bg-brand-orange hover:text-white")
        }
      >
        {copy.like}
        <span aria-hidden className={"flex size-[2.6cqw] items-center justify-center rounded-full " + (approved ? "bg-white text-[#1f7a3a]" : "bg-brand-orange-dark text-white")}>
          {approved ? <CheckIcon className="size-[1.6cqw]" /> : <ArrowRightIcon className="size-[1.5cqw]" />}
        </span>
      </button>

      <p className="text-center text-[1.75cqw] leading-relaxed text-pretty text-[#3a3228] mix-blend-multiply">{text}</p>
    </div>
  );
}
