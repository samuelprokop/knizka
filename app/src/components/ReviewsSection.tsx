"use client";

/*
  Recenzie na úvodnej stránke – podľa „Testimonial-v2“ (21st.dev, @avanishverma4):
  tri stĺpce kariet, ktoré sa nekonečne posúvajú nahor rôznou rýchlosťou,
  s vyblednutím hore a dole. Na mobile jeden stĺpec, na tablete dva.

  Sekcia sa zmestí na jednu obrazovku a správa sa ako ďalší krok knihy
  (jedno gesto = presun na recenzie, ďalšie = pätička). Stredný stĺpec ide opačne. Karty stoja, kým sa posúva stránka
  (čítanie nerušia dva pohyby naraz); pod myšou sa hýbu ďalej.
  Prístupnosť (WCAG 2.2.2): posúvanie sa dá zastaviť aj tlačidlom. Pri obmedzení animácií sa
  nehýbe nič a recenzie sú v obyčajnej mriežke. Kópia zoznamu pre plynulú
  slučku je pred čítačkou skrytá.
*/

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { LandingCopy } from "@/content/landing";
import type { Review } from "@/content/reviews";

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

/** Trvanie jedného obehu stĺpca – rôzne, aby sa stĺpce nehýbali naraz. */
const DURATIONS = ["10s", "12s", "11s"];
const AVATAR_COLORS = ["bg-brand-orange text-ink", "bg-brand-teal text-ink", "bg-brand-purple text-white"];

export function ReviewsSection({
  copy,
  reviews,
  placeholder,
}: {
  copy: LandingCopy["reviews"];
  reviews: Review[];
  placeholder: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const scrolling = useScrolling();
  const sectionRef = useRef<HTMLElement>(null);
  useSectionStep(sectionRef, !!reduceMotion);
  const columns = [0, 1, 2].map((c) => reviews.filter((_, i) => i % 3 === c));

  return (
    <section
      ref={sectionRef}
      id="recenzie"
      aria-labelledby="reviews-title"
      className="relative flex min-h-dvh flex-col justify-center px-4 pt-28 pb-10 sm:px-6 sm:pt-24 lg:pl-[calc(var(--hero-inset,0px)+1.5rem)]"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-xl flex-col items-center text-center"
      >
        <span className="rounded-full px-4 py-1 text-xs font-bold tracking-wider text-brand-orange-dark uppercase ring-1 ring-brand-orange/30">
          {copy.eyebrow}
        </span>
        <h2 id="reviews-title" className="mt-5 font-heading text-3xl font-extrabold text-ink sm:text-5xl">
          {copy.title}
        </h2>
        <p className="mt-4 text-base text-ink/65 sm:text-lg">{copy.subtitle}</p>
        {placeholder && (
          <p className="mt-4 rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-medium text-ink/75">{copy.placeholderNote}</p>
        )}
      </motion.div>

      <div
        className={cx(
          "group relative mx-auto mt-8 flex w-full max-w-5xl justify-center gap-6",
          "h-[max(16rem,calc(100dvh-26rem))] max-h-[40rem] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]",
          "motion-reduce:h-auto motion-reduce:max-h-none motion-reduce:flex-wrap motion-reduce:[mask-image:none]"
        )}
      >
        {columns.map((column, c) => (
          <div
            key={c}
            className={cx(
              "w-full max-w-xs flex-col gap-6 [animation:reviews-up_var(--duration)_linear_infinite] motion-reduce:[animation:none]",
              (paused || scrolling) && "[animation-play-state:paused]",
              c === 0 ? "flex" : c === 1 ? "hidden md:flex" : "hidden lg:flex",
              // Stredný stĺpec ide opačne (zhora nadol).
              c === 1 && "[animation-direction:reverse]"
            )}
            style={{ "--duration": DURATIONS[c] } as CSSProperties}
          >
            {[0, 1].map((copyIndex) => (
              <div
                key={copyIndex}
                aria-hidden={copyIndex === 1 || undefined}
                className={cx("flex flex-col gap-6", copyIndex === 1 && "motion-reduce:hidden")}
              >
                {column.map((review, i) => (
                  <ReviewCard key={review.name + i} review={review} color={AVATAR_COLORS[(c + i) % AVATAR_COLORS.length]} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink/70 ring-1 ring-ink/15 transition outline-none hover:text-ink hover:ring-ink/30 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? copy.play : copy.pause}
        </button>
      </div>
    </section>
  );
}

/**
 * Stránka sa pri posúvaní nadol na sekcii zastaví: keď jej horný okraj prejde
 * vrchom obrazovky, zarovná sa naň a vstup sa na chvíľu zablokuje (dobiehajúca
 * zotrvačnosť touchpadu ju neprešvihne). Ak posúvanie skončí s odkrytou sekciou
 * (aspoň do polovice), dotiahne sa. Nahor sa nezastavuje.
 */
/*
  Recenzie ako ďalší krok knihy: z poslednej zastávky hero (recenzie sú tesne
  pod obrazovkou) jedno gesto nadol = plynulý posun presne na recenzie; zvyšok
  gesta (aj zotrvačnosť touchpadu) sa zahodí, k pätičke vedie až nové gesto.
  Nahor: z recenzií späť na koniec knihy, z pätičky zastaví na recenziách.
  Vstup sa zachytáva vo fáze capture, takže ho hero zároveň nespracuje.
*/
function useSectionStep(ref: React.RefObject<HTMLElement | null>, reduceMotion: boolean) {
  useEffect(() => {
    const GESTURE_GAP_MS = 200;
    const COOLDOWN_MS = 450;
    const SWIPE_PX = 30;
    let running: { stop: () => void } | null = null;
    let lockedUntil = 0;
    let consumed = false;
    let lastWheel = 0;

    const vh = () => window.innerHeight;
    const top = () => ref.current?.getBoundingClientRect().top ?? Infinity;
    const absTop = () => top() + window.scrollY;
    const busy = () => running !== null || performance.now() < lockedUntil;
    // Oblasť, kde krok riadi táto sekcia: od konca knihy po pätičku.
    const inZone = () => top() <= vh() + 2 && top() > -vh();

    const scrollToY = (y: number) => {
      running?.stop();
      if (reduceMotion) {
        window.scrollTo(0, y);
        lockedUntil = performance.now() + COOLDOWN_MS;
        return;
      }
      running = animate(window.scrollY, y, {
        duration: 0.75,
        ease: [0.65, 0, 0.35, 1],
        onUpdate: (v) => window.scrollTo(0, v),
        onComplete: () => {
          running = null;
          lockedUntil = performance.now() + COOLDOWN_MS;
        },
      });
    };

    /** Kam ísť pri kroku daným smerom (null = nechať prehliadač / hero). */
    const targetFor = (dir: 1 | -1, delta: number): number | null => {
      const t = top();
      if (dir === 1 && t > 2 && t <= vh() + 2) return absTop(); // koniec knihy → recenzie
      if (dir === -1 && t >= -2 && t < vh() - 2) return absTop() - vh(); // recenzie → koniec knihy
      if (dir === -1 && t < -2 && t - delta >= -2) return absTop(); // z pätičky → zastaviť na recenziách
      return null;
    };

    const consume = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const now = performance.now();
      if (now - lastWheel > GESTURE_GAP_MS) consumed = false;
      lastWheel = now;
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * vh() : e.deltaY;
      if (d === 0) return;
      if (busy() || consumed) {
        if (inZone()) consume(e);
        return;
      }
      const target = targetFor(d > 0 ? 1 : -1, d);
      if (target === null) return;
      consume(e);
      consumed = true;
      scrollToY(target);
    };

    let touchY = 0;
    let touchFired = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
      touchFired = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dy = touchY - e.touches[0].clientY;
      if (touchFired || busy()) {
        if (inZone()) consume(e);
        return;
      }
      if (dy === 0) return;
      const target = targetFor(dy > 0 ? 1 : -1, dy);
      if (target === null) return;
      consume(e);
      if (Math.abs(dy) > SWIPE_PX) {
        touchFired = true;
        scrollToY(target);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === " " && el?.closest("button, a")) return;
      const next = ["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey);
      const prev = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
      if (!next && !prev) return;
      if (busy()) {
        if (inZone()) consume(e);
        return;
      }
      const target = targetFor(next ? 1 : -1, next ? vh() : -vh());
      if (target === null) return;
      consume(e);
      scrollToY(target);
    };

    const capture = { capture: true, passive: false } as const;
    window.addEventListener("wheel", onWheel, capture);
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, capture);
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      running?.stop();
      window.removeEventListener("wheel", onWheel, capture);
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, capture);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [ref, reduceMotion]);
}

/** true, kým sa stránka posúva (a chvíľu po poslednom posune). */
function useScrolling(idleMs = 180) {
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), idleMs);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [idleMs]);
  return scrolling;
}

function ReviewCard({ review, color }: { review: Review; color: string }) {
  return (
    <figure className="rounded-3xl bg-white p-7 shadow-lg shadow-ink/[0.06] ring-1 ring-ink/[0.06]">
      <QuoteIcon />
      <blockquote className="mt-3 text-[15px] leading-relaxed text-ink/80">{review.text}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span aria-hidden className={cx("flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-base font-extrabold", color)}>
          {review.name[0]}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">{review.name}</span>
          <span className="text-sm text-ink/60">{review.detail}</span>
        </span>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- ikony (SVG, nie emoji)

function QuoteIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6 fill-brand-orange/80">
      <path d="M9.6 5C6.1 6.6 4 9.5 4 13.3V19h6v-6H7.1c.1-2.4 1.4-4.2 3.6-5.3L9.6 5zm10 0c-3.5 1.6-5.6 4.5-5.6 8.3V19h6v-6h-2.9c.1-2.4 1.4-4.2 3.6-5.3L19.6 5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-current">
      <rect x="4" y="3" width="3" height="10" rx="1" />
      <rect x="9" y="3" width="3" height="10" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M5 3.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 5 3.5z" />
    </svg>
  );
}
