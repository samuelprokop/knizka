"use client";

import { animate } from "motion/react";
import { useEffect } from "react";

import { EASE } from "@/lib/motion";

/*
  Sekcia úvodnej stránky ako ďalší krok knihy (recenzie, časté otázky): keď je sekcia
  tesne pod obrazovkou, jedno gesto nadol = plynulý posun presne na jej začiatok;
  zvyšok gesta (aj zotrvačnosť touchpadu) sa zahodí, ďalej vedie až nové gesto.
  Nahor: zo začiatku sekcie na predchádzajúcu zastávku (previousY), zospodu
  (ďalšia sekcia, pätička) sa zastaví na začiatku sekcie. Vyššia sekcia (rozbalená
  odpoveď) sa vnútri posúva normálne.
  Vstup sa zachytáva vo fáze capture a pri spracovaní sa zastaví úplne
  (stopImmediatePropagation) – hero ani iná sekcia ho zároveň nespracuje.
*/
export function useSectionStep(ref: React.RefObject<HTMLElement | null>, reduceMotion: boolean, previousY: () => number) {
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
    // Oblasť, kde krok riadi táto sekcia: od obrazovky nad ňou po obrazovku pod ňou.
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
        ease: EASE.inOut,
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
      if (dir === 1 && t > 2 && t <= vh() + 2) return absTop(); // zhora → začiatok sekcie
      if (dir === -1 && t >= -2 && t < vh() - 2) return previousY(); // začiatok sekcie → predchádzajúca zastávka
      if (dir === -1 && t < -2 && t - delta >= -2) return absTop(); // zospodu → zastaviť na začiatku sekcie
      return null;
    };

    const consume = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previousY sa číta pri každom kroku, nemení sa
  }, [ref, reduceMotion]);
}
