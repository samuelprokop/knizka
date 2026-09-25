"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

import type { LandingCopy } from "@/content/landing";
import { MotionCta } from "./buttons";
import { HeroBook, type BookState } from "./HeroBook";

type Segment = { kind: "hold"; weight: number; overlay: number } | { kind: "play"; weight: number };

// Časová os knihy (HeroBook): pauzy = zastávky (úvod, 4 dvojstrany, koniec),
// „play“ = pohyb – otvorenie obálky, tri otočenia strany, zatvorenie knihy.
const TIMELINE: Segment[] = [
  { kind: "hold", weight: 0.6, overlay: 0 },
  { kind: "play", weight: 1.2 },
  { kind: "hold", weight: 1, overlay: 1 },
  { kind: "play", weight: 1 },
  { kind: "hold", weight: 1, overlay: 2 },
  { kind: "play", weight: 1 },
  { kind: "hold", weight: 1, overlay: 3 },
  { kind: "play", weight: 1 },
  { kind: "hold", weight: 1, overlay: 4 },
  { kind: "play", weight: 1.2 },
  { kind: "hold", weight: 0.8, overlay: 5 },
];
const TOTAL_WEIGHT = TIMELINE.reduce((sum, s) => sum + s.weight, 0);
// Scroll dĺžka jednej váhovej jednotky v násobkoch výšky okna (len pre
// posuvník – o pohybe knihy rozhoduje časovanie nižšie, nie rýchlosť scrollu).
const VIEWPORTS_PER_WEIGHT = 0.8;

// Zastavenia = pauzy: úvod na začiatku, dvojstrany v strede svojej pauzy, footer na konci.
const STOPS = (() => {
  const stops: number[] = [];
  let acc = 0;
  TIMELINE.forEach((seg, i) => {
    if (seg.kind === "hold") {
      if (i === 0) stops.push(0);
      else if (i === TIMELINE.length - 1) stops.push(1);
      else stops.push((acc + seg.weight / 2) / TOTAL_WEIGHT);
    }
    acc += seg.weight;
  });
  return stops;
})();

// ---------------------------------------------------------------- navigácia (obsah stránky)

/*
  Obsah stránky (LandingToc) potrebuje vedieť, na ktorej zastávke kniha je,
  a vedieť na ňu prelistovať. Hero stav publikuje sem; bez hero je goTo prázdne.
*/
const navListeners = new Set<() => void>();
let navCurrent = 0;
let navGoTo: ((index: number) => void) | null = null;
let navJumpTo: ((index: number) => void) | null = null;

function publishCurrent(index: number) {
  if (navCurrent === index) return;
  navCurrent = index;
  navListeners.forEach((listener) => listener());
}

export const heroNavigation = {
  /** Počet zastávok knihy (úvod, 4 dvojstrany, koniec). */
  stops: STOPS.length,
  subscribe(listener: () => void) {
    navListeners.add(listener);
    return () => {
      navListeners.delete(listener);
    };
  },
  getCurrent: () => navCurrent,
  /** Prelistuje knihu na zastávku konštantnou rýchlosťou (aj spoza hero). */
  goTo: (index: number) => navGoTo?.(index),
  /** Skočí na zastávku hneď, bez prehrávania otočení medzi (obsah stránky vľavo). */
  jumpTo: (index: number) => navJumpTo?.(index),
};

// Konštantná rýchlosť prehrávania (sekundy na váhovú jednotku). Otočenie strany
// (váha 1) trvá PLAY sekúnd; úseky pauzy len dofadnú / nafadnú text.
const PLAY_SECONDS_PER_WEIGHT = 1.1;
const HOLD_SECONDS_PER_WEIGHT = 0.45;
// Po dokončení otočenia sa vstup chvíľu ignoruje – nedá sa prescrollovať naraz.
const COOLDOWN_MS = 500;
// Nové gesto kolieska/touchpadu = aspoň takáto medzera od predošlej udalosti.
const GESTURE_GAP_MS = 160;
// Koľko px musí gesto nazbierať, kým spustí krok (touchpad začína drobnými deltami).
const WHEEL_THRESHOLD = 24;
const SEGMENT_BOUNDS = TIMELINE.reduce<number[]>(
  (acc, seg) => [...acc, acc[acc.length - 1] + seg.weight / TOTAL_WEIGHT],
  [0]
);

// Kľúčové snímky pre prechod medzi dvoma bodmi: každý úsek dostane čas podľa
// svojej váhy a druhu, takže rýchlosť je konštantná bez ohľadu na vstup.
function stepKeyframes(from: number, to: number) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const inner = SEGMENT_BOUNDS.filter((b) => b > lo + 1e-6 && b < hi - 1e-6);
  const points = [from, ...(from < to ? inner : inner.reverse()), to];
  const durations = points.slice(1).map((p, i) => {
    const { seg } = resolve((p + points[i]) / 2);
    const rate = seg.kind === "play" ? PLAY_SECONDS_PER_WEIGHT : HOLD_SECONDS_PER_WEIGHT;
    return Math.abs(p - points[i]) * TOTAL_WEIGHT * rate;
  });
  const duration = durations.reduce((a, b) => a + b, 0);
  let elapsed = 0;
  const times = [0, ...durations.map((d) => (elapsed += d) / (duration || 1))];
  return { values: points, times, duration };
}

function resolve(progress: number) {
  let x = Math.min(Math.max(progress, 0), 1) * TOTAL_WEIGHT;
  for (let i = 0; i < TIMELINE.length; i++) {
    const seg = TIMELINE[i];
    if (x <= seg.weight || i === TIMELINE.length - 1) {
      return { seg, index: i, t: Math.min(x / seg.weight, 1) };
    }
    x -= seg.weight;
  }
  return { seg: TIMELINE[0], index: 0, t: 0 };
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** Stav knihy pre HeroBook: koľko prechodov je hotových a ktorý práve beží. */
function bookStateAt(progress: number): BookState {
  const { seg, index, t } = resolve(progress);
  const done = TIMELINE.slice(0, index).filter((s) => s.kind === "play").length;
  return seg.kind === "play" ? { done, moving: done, t } : { done, moving: -1, t: 0 };
}

function overlayOpacityAt(progress: number, overlay: number) {
  const { seg, index, t } = resolve(progress);
  if (seg.kind !== "hold" || seg.overlay !== overlay) return 0;
  const fade = 0.3;
  const fadeIn = index === 0 ? 1 : Math.min(t / fade, 1);
  const fadeOut = index === TIMELINE.length - 1 ? 1 : Math.min((1 - t) / fade, 1);
  return smoothstep(Math.max(0, Math.min(fadeIn, fadeOut)));
}

function Overlay({
  progress,
  overlay,
  className,
  interactive = false,
  children,
}: {
  progress: MotionValue<number>;
  overlay: number;
  className: string;
  interactive?: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, (p) => overlayOpacityAt(p, overlay));
  const y = useTransform(opacity, [0, 1], [16, 0]);
  const pointerEvents = useTransform(opacity, (o) =>
    interactive && o > 0.5 ? "auto" : "none"
  );
  return (
    <motion.div style={{ opacity, y, pointerEvents }} className={className}>
      {children}
    </motion.div>
  );
}

type HeroProps = { copy: LandingCopy; ctaHref: string; /** Naformátované ceny trhu pre cenovú kotvu. */ prices: { ebook: string; print: string } };

export function BookHero(props: HeroProps) {
  const reduced = useReducedMotion();
  if (reduced) return <StaticHero {...props} />;
  return <AnimatedHero {...props} />;
}

function AnimatedHero({ copy, ctaHref, prices }: HeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Progres knihy riadi čas, nie scroll: scroll len spúšťa kroky.
  const progress = useMotionValue(0);

  // Krokovanie: gesto (koliesko, touchpad, swipe, klávesa) spustí otočenie na
  // ďalšiu dvojstranu, ktoré prebehne konštantnou rýchlosťou. Počas otáčania
  // a COOLDOWN_MS po ňom sa vstup ignoruje. Posuvník stránky len sleduje progres.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Refresh vždy začína zatvorenou knihou – prehliadač inak obnoví scroll.
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    progress.jump(0);

    const LAST = STOPS.length - 1;
    const top = () => container.getBoundingClientRect().top + window.scrollY;
    const range = () => Math.max(1, container.offsetHeight - window.innerHeight);
    const scrollFor = (p: number) => top() + p * range();
    const progressForScroll = () =>
      Math.min(1, Math.max(0, (window.scrollY - top()) / range()));
    // Hero ovláda vstup, kým stránka nie je posunutá pod jeho koniec.
    const inHero = () => window.scrollY <= scrollFor(1) + 2;

    let current = 0;
    publishCurrent(0);
    let controls: ReturnType<typeof animate> | null = null;
    let lockedUntil = 0;
    let safetyTimer = 0;
    let settleTimer = 0;

    const isLocked = () => controls !== null || performance.now() < lockedUntil;

    const setScroll = (p: number) => window.scrollTo(0, scrollFor(p));

    // speed > 1 = rýchlejšie otočenie (skok z menu prehrá len posledné, zrýchlené).
    const goTo = (index: number, speed = 1) => {
      const target = Math.max(0, Math.min(LAST, index));
      const from = progress.get();
      const to = STOPS[target];
      current = target;
      publishCurrent(target);
      if (Math.abs(to - from) < 1e-4) return;
      const keyframes = stepKeyframes(from, to);
      const { values, times } = keyframes;
      const duration = keyframes.duration / speed;
      const finish = () => {
        window.clearTimeout(safetyTimer);
        controls = null;
        lockedUntil = performance.now() + COOLDOWN_MS;
      };
      controls?.stop();
      window.clearTimeout(safetyTimer);
      controls = animate(progress, values, {
        duration,
        times,
        ease: "linear",
        onUpdate: setScroll,
        onComplete: finish,
      });
      // Poistka: ak by animácia nedobehla (karta na pozadí), vstup sa nezamkne navždy.
      safetyTimer = window.setTimeout(() => {
        if (!controls) return;
        controls.stop();
        progress.jump(to);
        setScroll(to);
        finish();
      }, duration * 1000 + 400);
    };

    // Skok z menu: kniha sa hneď presunie na susednú zastávku pred cieľom (zo
    // strany, odkiaľ ide) a prehrá už len jedno, zrýchlené otočenie – zmena je
    // vidieť, ale nečaká sa na všetky dvojstrany medzi.
    const JUMP_SPEED = 2;
    const jumpTo = (index: number) => {
      const target = Math.max(0, Math.min(LAST, index));
      controls?.stop();
      controls = null;
      window.clearTimeout(safetyTimer);
      const here = progress.get();
      if (Math.abs(here - STOPS[target]) < 1e-4) {
        current = target;
        publishCurrent(target);
        setScroll(STOPS[target]);
        return;
      }
      const direction = STOPS[target] > here ? 1 : -1;
      const before = Math.max(0, Math.min(LAST, target - direction));
      // Susedná zastávka je bližšie ako aktuálna poloha → preskočiť na ňu.
      if (Math.abs(STOPS[before] - STOPS[target]) < Math.abs(here - STOPS[target])) {
        progress.jump(STOPS[before]);
        setScroll(STOPS[before]);
      }
      goTo(target, JUMP_SPEED);
    };

    // Vráti true, ak krok patrí heru (a vstup treba zablokovať), false ak má
    // stránka scrollovať normálne (pod herom, alebo za posledným zastavením).
    const claims = (direction: 1 | -1) => {
      if (!inHero()) return false;
      if (direction === 1 && current === LAST && !controls) return false;
      return true;
    };

    const step = (direction: 1 | -1) => {
      if (isLocked()) return;
      goTo(current + direction);
    };

    // Jedno gesto = najviac jeden krok. Gesto končí pauzou medzi udalosťami,
    // zmenou smeru, alebo prudkým nárastom delty (nové potiahnutie počas
    // dobiehajúcej zotrvačnosti touchpadu). Spotrebované gesto už nič nespustí,
    // ani keď jeho zotrvačnosť dobieha po skončení cooldownu.
    let lastWheel = 0;
    let lastDelta = 0;
    let gestureAccum = 0;
    let gestureFired = false;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom na touchpade
      const now = performance.now();
      const d =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (now - lastWheel > GESTURE_GAP_MS) {
        gestureAccum = 0;
        gestureFired = false;
        lastDelta = 0;
      }
      lastWheel = now;
      if (d === 0) {
        if (inHero()) e.preventDefault();
        return;
      }
      if (!claims(d > 0 ? 1 : -1)) return;
      e.preventDefault();
      const reversed = gestureAccum !== 0 && Math.sign(d) !== Math.sign(gestureAccum);
      const surge = gestureFired && Math.abs(d) > Math.abs(lastDelta) * 1.6 + 8;
      lastDelta = d;
      if (reversed || surge) {
        gestureAccum = 0;
        gestureFired = false;
      }
      if (gestureFired) return;
      gestureAccum += d;
      if (Math.abs(gestureAccum) < WHEEL_THRESHOLD) return;
      gestureFired = true;
      step(gestureAccum > 0 ? 1 : -1);
    };

    let touchStartY = 0;
    let touchFired = false;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchFired = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (dy === 0 || !claims(dy > 0 ? 1 : -1)) return;
      e.preventDefault();
      if (!touchFired && Math.abs(dy) > 40) {
        touchFired = true;
        step(dy > 0 ? 1 : -1);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // Medzerník na tlačidle či odkaze ho stlačí – knihu nelistuje.
      if (e.key === " " && el?.closest("button, a")) return;
      const next = ["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey);
      const prev = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
      if (!(next || prev) || !claims(next ? 1 : -1)) return;
      e.preventDefault();
      step(next ? 1 : -1);
    };

    // Scroll mimo krokovača (ťahanie posuvníka, Home/End, hľadanie na stránke):
    // kniha ho sleduje a po zastavení dobehne na najbližšiu dvojstranu.
    const onScroll = () => {
      if (controls) return;
      // Pod herom (pätička, ďalší obsah) je kniha vždy zatvorená na konci – aj keď
      // sa sem niekto dostal skokom (End, posuvník), nie krokovaním.
      if (!inHero()) {
        if (progress.get() !== 1) progress.set(1);
        current = LAST;
        publishCurrent(LAST);
        return;
      }
      // Vlastný scroll (dorovnanie posuvníka) – nič nerobiť.
      if (Math.abs(window.scrollY - scrollFor(progress.get())) < 2) return;
      progress.set(progressForScroll());
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (controls || !inHero()) return;
        const p = progress.get();
        let nearest = 0;
        STOPS.forEach((s, i) => {
          if (Math.abs(s - p) < Math.abs(STOPS[nearest] - p)) nearest = i;
        });
        goTo(nearest);
      }, 150);
    };

    const onResize = () => {
      if (!controls) setScroll(progress.get());
    };

    navGoTo = goTo;
    navJumpTo = jumpTo;
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      navGoTo = null;
      navJumpTo = null;
      controls?.stop();
      window.clearTimeout(safetyTimer);
      window.clearTimeout(settleTimer);
      history.scrollRestoration = previousRestoration;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [progress]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${(TOTAL_WEIGHT * VIEWPORTS_PER_WEIGHT + 1) * 100}svh` }}
    >
      {/* --hero-inset: miesto pre obsah stránky vľavo (LandingToc), inak 0. */}
      {/* Od tabletu scéna začína pod hlavičkou (--hero-top) – výzva „Vytvoriť knihu“ v hlavičke
          má okolo seba voľné miesto a otvorená kniha na ňu nenalieha. Scéna sa zmenší podľa
          výšky, ktorá pod hlavičkou ostane. */}
      <section className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-white pl-[var(--hero-inset,0px)] md:pt-[var(--hero-top)] md:pb-3 md:[--hero-top:6rem]">
        <div
          className="relative aspect-[4/3] [container-type:inline-size] md:aspect-video"
          style={{ width: "min(calc(100vw - var(--hero-inset, 0px)), calc((100dvh - var(--hero-top, 0px) - 0.75rem) * 16 / 9))" }}
        >
          <HeroBook progress={progress} stateAt={bookStateAt} steps={copy.steps} coverTitle={copy.coverTitle} label={copy.animationLabel} />
          {/* Texty krokov sú vytlačené na stranách knihy (aria-hidden) – pre čítačku tu. */}
          <ol className="sr-only">
            {copy.steps.map((step) => (
              <li key={step.number}>
                {step.number} {step.title}. {step.text}
              </li>
            ))}
          </ol>

          <div className="absolute inset-0 hidden md:block">
            <Overlay
              progress={progress}
              overlay={0}
              interactive
              className="absolute left-[6%] top-[34%] w-[33%]"
            >
              <p className="font-heading text-[1.1cqw] font-bold uppercase tracking-wider text-brand-orange">
                {copy.eyebrow}
              </p>
              <h1 className="mt-[1cqw] font-heading text-[3.6cqw] font-extrabold leading-[1.05] text-ink">
                {copy.title}
              </h1>
              <PrimaryCta href={ctaHref} label={copy.cta} note={copy.ctaNote} className="mt-[2cqw]" />
              <p className="mt-[2.2cqw] text-[1cqw] text-ink/55">{copy.scrollHint}</p>
            </Overlay>

            <Overlay
              progress={progress}
              overlay={5}
              interactive
              className="absolute left-[63%] top-[36%] w-[31%]"
            >
              <h2 className="font-heading text-[3cqw] font-extrabold leading-[1.1] text-ink">
                {copy.outroTitle}
              </h2>
              <p className="mt-[1cqw] text-[1.3cqw] text-ink/60">
                {copy.outroText}
              </p>
              <p className="mt-[1.2cqw] text-[1.15cqw] font-semibold text-ink">{priceLine(copy, prices)}</p>
              <PrimaryCta href={ctaHref} label={copy.cta} note={copy.ctaNote} className="mt-[1.4cqw]" />
            </Overlay>
          </div>
        </div>

        <div className="absolute inset-x-6 bottom-10 md:hidden">
          {[
            { eyebrow: copy.eyebrow, title: copy.title, text: copy.scrollHint },
            ...copy.steps.map((s) => ({ eyebrow: s.number, title: s.title, text: s.text })),
            { eyebrow: "", title: copy.outroTitle, text: copy.outroText },
          ].map((item, i, all) => (
            <Overlay
              key={item.title}
              progress={progress}
              overlay={i}
              interactive={i === 0 || i === all.length - 1}
              className="absolute inset-x-0 bottom-0"
            >
              {item.eyebrow && (
                <p className="font-heading text-sm font-bold text-brand-orange">{item.eyebrow}</p>
              )}
              <p className="mt-1 font-heading text-2xl font-extrabold leading-tight text-ink">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-ink/60">{item.text}</p>
              {i === all.length - 1 && <p className="mt-2 text-sm font-semibold text-ink">{priceLine(copy, prices)}</p>}
              {(i === 0 || i === all.length - 1) && (
                <MotionCta href={ctaHref} className="mt-4 text-base">
                  {copy.cta}
                </MotionCta>
              )}
              {(i === 0 || i === all.length - 1) && <p className="mt-2 text-xs text-ink/60">{copy.ctaNote}</p>}
            </Overlay>
          ))}
        </div>
      </section>
    </div>
  );
}

function StaticHero({ copy, ctaHref, prices }: HeroProps) {
  const progress = useMotionValue(STOPS[1]);
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-heading text-sm font-bold uppercase tracking-wider text-brand-orange">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold text-ink">
          {copy.title}
        </h1>
<div className="relative mt-10 aspect-video w-full [container-type:inline-size]">
          <HeroBook progress={progress} stateAt={bookStateAt} steps={copy.steps} coverTitle={copy.coverTitle} label={copy.staticImageAlt} />
        </div>
        <ol className="mt-10 space-y-8">
          {copy.steps.map((step) => (
            <li key={step.number}>
              <span className="font-heading text-2xl font-extrabold text-brand-orange">{step.number}</span>
              <h2 className="font-heading text-xl font-extrabold text-ink">{step.title}</h2>
              <p className="mt-1 text-ink/70">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 font-semibold text-ink">{priceLine(copy, prices)}</p>
        <Link
          href={ctaHref}
          className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand-orange-dark px-6 text-base font-semibold text-white"
        >
          {copy.cta}
        </Link>
        <p className="mt-2 text-sm text-ink/60">{copy.ctaNote}</p>
      </div>
    </section>
  );
}

const priceLine = (copy: LandingCopy, prices: HeroProps["prices"]) =>
  copy.priceLine.replace("{ebook}", prices.ebook).replace("{print}", prices.print);

/** Hlavná výzva hero – jediná na obrazovke (hlavička svoje tlačidlo vtedy skryje). */
function PrimaryCta({ href, label, note, className = "" }: { href: string; label: string; note: string; className?: string }) {
  return (
    <div className={className}>
      <MotionCta href={href} className="text-[1.25cqw]">
        {label}
      </MotionCta>
      <p className="mt-[0.8cqw] text-[0.95cqw] text-ink/60">{note}</p>
    </div>
  );
}
