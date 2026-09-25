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

import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { LandingCopy } from "@/content/landing";
import type { Review } from "@/content/reviews";
import { useSectionStep } from "./useSectionStep";

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
  // Z konca knihy jedno gesto = recenzie; nahor späť na koniec knihy (obrazovka nad nimi).
  useSectionStep(sectionRef, !!reduceMotion, () => (sectionRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - window.innerHeight);
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
        transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: EASE.out }}
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
