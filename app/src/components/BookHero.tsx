"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

import type { LandingCopy } from "@/content/landing";

const FRAME_COUNT = 361;
const frameSrc = (i: number) => `/hero/book/${String(i).padStart(3, "0")}.webp`;

type Segment =
  | { kind: "hold"; frame: number; weight: number; overlay: number }
  | { kind: "play"; from: number; to: number; weight: number };

// Indexy sú snímky Kling videa (24 fps), rozsahy "play" sú orezané na úseky,
// kde sa reálne niečo hýbe, aby scroll nemal "mŕtve" miesta.
// Video má len 3 dvojstrany – štvrtá vzniká zopakovaním otočenia 128→200;
// prázdne dvojstrany sú takmer pixelovo zhodné, takže skok z 262 na 128 nie je vidieť.
const TIMELINE: Segment[] = [
  // Snímka 0 – video sa začína hýbať hneď od začiatku, neskoršia snímka by
  // už ukazovala nadvihnutú obálku.
  { kind: "hold", frame: 0, weight: 0.6, overlay: 0 },
  { kind: "play", from: 0, to: 80, weight: 1.2 },
  { kind: "hold", frame: 80, weight: 1, overlay: 1 },
  { kind: "play", from: 128, to: 200, weight: 1 },
  { kind: "hold", frame: 200, weight: 1, overlay: 2 },
  { kind: "play", from: 216, to: 262, weight: 0.8 },
  { kind: "hold", frame: 262, weight: 1, overlay: 3 },
  { kind: "play", from: 128, to: 200, weight: 1 },
  { kind: "hold", frame: 200, weight: 1, overlay: 4 },
  { kind: "play", from: 294, to: 360, weight: 1.2 },
  { kind: "hold", frame: 360, weight: 0.8, overlay: 5 },
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

type Sample = { a: number; b: number; mix: number };
const BLEND = 0.2;

// Hranice segmentov nie sú vždy tá istá snímka (napr. 80 -> 128), preto sa na
// začiatku a konci každej pauzy obraz prelína so susedným segmentom – v čase,
// keď text práve zjavuje / mizne. Žiadny viditeľný skok.
function sampleAt(progress: number): Sample {
  const { seg, index, t } = resolve(progress);
  if (seg.kind === "play") {
    const f = seg.from + (seg.to - seg.from) * t;
    return { a: f, b: f, mix: 0 };
  }
  const prev = TIMELINE[index - 1];
  const next = TIMELINE[index + 1];
  if (prev?.kind === "play" && prev.to !== seg.frame && t < BLEND) {
    return { a: prev.to, b: seg.frame, mix: smoothstep(t / BLEND) };
  }
  if (next?.kind === "play" && next.from !== seg.frame && t > 1 - BLEND) {
    return { a: seg.frame, b: next.from, mix: smoothstep((t - (1 - BLEND)) / BLEND) };
  }
  return { a: seg.frame, b: seg.frame, mix: 0 };
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

type HeroProps = { copy: LandingCopy; ctaHref: string };

export function BookHero(props: HeroProps) {
  const reduced = useReducedMotion();
  if (reduced) return <StaticHero {...props} />;
  return <AnimatedHero {...props} />;
}

function AnimatedHero({ copy, ctaHref }: HeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<(sample: Sample) => void>(() => {});

  // Progres knihy riadi čas, nie scroll: scroll len spúšťa kroky.
  const progress = useMotionValue(0);

  useMotionValueEvent(progress, "change", (p) => drawRef.current(sampleAt(p)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";

    const images: HTMLImageElement[] = new Array(FRAME_COUNT);
    const ready: boolean[] = new Array(FRAME_COUNT).fill(false);
    let wanted = sampleAt(progress.get());
    let drawnKey = "";
    let cancelled = false;

    const nearestReady = (i: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (i - d >= 0 && ready[i - d]) return i - d;
        if (i + d < FRAME_COUNT && ready[i + d]) return i + d;
      }
      return -1;
    };

    // Canvas je skrytý, kým nenakreslí prvú snímku – dovtedy je vidieť
    // statický obrázok zatvorenej knihy pod ním (nikdy prázdna / čierna plocha).
    let shown = false;
    const paint = (index: number, alpha: number) => {
      const i = ready[index] ? index : nearestReady(index);
      if (i < 0) return false;
      ctx.globalAlpha = alpha;
      ctx.drawImage(images[i], 0, 0, canvas.width, canvas.height);
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
      return i === index;
    };

    // Medzi susednými snímkami sa prelína podľa desatinnej časti indexu, takže
    // pohyb je plynulý aj pri pomalom scrolle; pri skoku medzi segmentmi sa
    // prelínajú dve pauzové snímky (viď sampleAt). Max. 2 drawImage na snímku.
    const draw = (sample: Sample, force = false) => {
      wanted = sample;
      const key = `${sample.a.toFixed(2)}|${sample.b.toFixed(2)}|${sample.mix.toFixed(3)}`;
      if (!force && key === drawnKey) return;
      let exact: boolean;
      if (sample.mix > 0.001) {
        exact = paint(Math.round(sample.a), 1);
        exact = paint(Math.round(sample.b), sample.mix) && exact;
      } else {
        const a = Math.floor(sample.a);
        const frac = sample.a - a;
        exact = paint(a, 1);
        if (exact && frac > 0.02 && a + 1 < FRAME_COUNT && ready[a + 1]) paint(a + 1, frac);
      }
      ctx.globalAlpha = 1;
      drawnKey = exact ? key : "";
    };
    drawRef.current = draw;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Zdroj má 1280 px – väčší buffer už nepridá detail, len zaťaží GPU.
      const width = Math.min(Math.round(canvas.clientWidth * dpr), 1920);
      canvas.width = width;
      canvas.height = Math.round((width * 9) / 16);
      draw(wanted, true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // Najprv snímky okolo aktuálnej polohy, potom zvyšok.
    const start = Math.round(wanted.a);
    const order = Array.from({ length: FRAME_COUNT }, (_, i) => i).sort(
      (x, y) => Math.abs(x - start) - Math.abs(y - start)
    );
    for (const i of order) {
      const img = new Image();
      images[i] = img;
      // Pripravená už po onload; decode() len predohrieva dekódovanie mimo
      // hlavného vlákna. Nečakáme naň – v karte na pozadí ostáva visieť.
      img.onload = () => {
        if (cancelled) return;
        ready[i] = true;
        img.decode().catch(() => {});
        const needed =
          Math.abs(i - wanted.a) <= 1 || Math.abs(i - wanted.b) <= 1 || drawnKey === "";
        if (needed) draw(wanted, true);
      };
      img.src = frameSrc(i);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      drawRef.current = () => {};
    };
  }, [progress]);

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

    const goTo = (index: number) => {
      const target = Math.max(0, Math.min(LAST, index));
      const from = progress.get();
      const to = STOPS[target];
      current = target;
      publishCurrent(target);
      if (Math.abs(to - from) < 1e-4) return;
      const { values, times, duration } = stepKeyframes(from, to);
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
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      navGoTo = null;
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
      <section className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-white">
        <div
          className="relative [container-type:inline-size]"
          style={{ width: "min(100vw, calc(100dvh * 16 / 9))", aspectRatio: "16 / 9" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frameSrc(0)}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full opacity-0"
            aria-label={copy.animationLabel}
            role="img"
          />

          <div className="absolute inset-0 hidden md:block">
            <Overlay
              progress={progress}
              overlay={0}
              className="absolute left-[6%] top-[38%] w-[33%]"
            >
              <p className="font-heading text-[1.1cqw] font-bold uppercase tracking-wider text-brand-orange">
                {copy.eyebrow}
              </p>
              <h1 className="mt-[1cqw] font-heading text-[3.6cqw] font-extrabold leading-[1.05] text-ink">
                {copy.title}
              </h1>
              <p className="mt-[1.4cqw] text-[1.2cqw] text-ink/60">{copy.scrollHint}</p>
            </Overlay>

            {copy.steps.map((step, i) => (
              <Overlay key={step.number} progress={progress} overlay={i + 1} className="absolute inset-0">
                <div className="absolute left-[19%] top-[24%] w-[26%]">
                  <span className="font-heading text-[4.5cqw] font-extrabold leading-none text-brand-orange">
                    {step.number}
                  </span>
                  <h2 className="mt-[1cqw] font-heading text-[2.5cqw] font-extrabold leading-[1.1] text-ink">
                    {step.title}
                  </h2>
                </div>
                <p className="absolute left-[55%] top-[32%] w-[25%] text-[1.35cqw] leading-relaxed text-ink/70">
                  {step.text}
                </p>
              </Overlay>
            ))}

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
              <Link
                href={ctaHref}
                className="mt-[1.8cqw] inline-block rounded-full bg-brand-orange px-[2cqw] py-[0.9cqw] text-[1.2cqw] font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-orange-dark"
              >
                {copy.cta}
              </Link>
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
              interactive={i === all.length - 1}
              className="absolute inset-x-0 bottom-0"
            >
              {item.eyebrow && (
                <p className="font-heading text-sm font-bold text-brand-orange">{item.eyebrow}</p>
              )}
              <p className="mt-1 font-heading text-2xl font-extrabold leading-tight text-ink">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-ink/60">{item.text}</p>
              {i === all.length - 1 && (
                <Link
                  href={ctaHref}
                  className="mt-4 inline-block rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {copy.cta}
                </Link>
              )}
            </Overlay>
          ))}
        </div>
      </section>
    </div>
  );
}

function StaticHero({ copy, ctaHref }: HeroProps) {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-heading text-sm font-bold uppercase tracking-wider text-brand-orange">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold text-ink">
          {copy.title}
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameSrc(80)} alt={copy.staticImageAlt} className="mt-10 w-full" />
        <ol className="mt-10 space-y-8">
          {copy.steps.map((step) => (
            <li key={step.number}>
              <span className="font-heading text-2xl font-extrabold text-brand-orange">{step.number}</span>
              <h2 className="font-heading text-xl font-extrabold text-ink">{step.title}</h2>
              <p className="mt-1 text-ink/70">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href={ctaHref}
          className="mt-12 inline-block rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
