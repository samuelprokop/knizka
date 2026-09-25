"use client";

/*
  Vloženie do košíka podľa „Add to basket“ (motion.dev / 21st.dev, MIT): kópia knihy
  preletí po oblúku z tlačidla do košíka vpravo hore, košík sa pri dopade zhúpne.
  Len ozdoba – pri prefers-reduced-motion sa preskočí a pokračuje sa hneď.

    const basket = useFlyToBasket();
    await basket.fly(buttonElement);   // potom router.push(košík)
    {basket.layer}
*/

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { BasketIcon, BookIcon } from "./icons";

type Flight = { x: number; y: number; floating: boolean };

export function useFlyToBasket(label: string) {
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const basketRef = useRef<HTMLDivElement>(null);

  const fly = useCallback(
    async (from: HTMLElement | null) => {
      if (reduce || !from) return;
      const rect = from.getBoundingClientRect();
      // Cieľ: košík v hlavičke (ak je na obrazovke), inak plávajúci košík vpravo hore.
      const header = document.querySelector<HTMLElement>("[data-cart-target]");
      const headerRect = header?.getBoundingClientRect();
      const useHeader = !!headerRect && headerRect.width > 0 && headerRect.bottom > 0;
      setFlight({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, floating: !useHeader });
      // Počkať na vykreslenie vrstvy s košíkom.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const item = scope.current?.querySelector<HTMLElement>("[data-item]");
      const target = useHeader ? header : basketRef.current;
      const basket = target?.getBoundingClientRect();
      if (!item || !basket || !target) return;
      const dx = basket.left + basket.width / 2 - (rect.left + rect.width / 2);
      const dy = basket.top + basket.height / 2 - (rect.top + rect.height / 2);
      // Oblúk: vodorovne rovnomerne, zvislo najprv nahor (nie nad okraj okna), potom do košíka.
      const peak = Math.max(40 - (rect.top + rect.height / 2), Math.min(dy, 0) - 70);
      await animate(
        item,
        { x: [0, dx * 0.55, dx], y: [0, peak, dy], scale: [1, 0.9, 0.35], rotate: [0, -12, 8] },
        { duration: 0.75, ease: [EASE.out, EASE.in], times: [0, 0.45, 1] }
      );
      await animate(item, { opacity: 0 }, { duration: 0.08 });
      await animate(target, { scale: [1, 1.18, 0.96, 1] }, { duration: 0.35 });
      setFlight(null);
    },
    [animate, reduce, scope]
  );

  const layer: ReactNode = (
    <div ref={scope} aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      <AnimatePresence>
        {flight && (
          <>
            {flight.floating && <motion.div
              ref={basketRef}
              initial={{ opacity: 0, scale: 0.6, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
              className="absolute top-4 right-4 flex size-14 items-center justify-center rounded-2xl bg-white text-brand-orange-dark shadow-xl ring-1 ring-ink/10"
              title={label}
            >
              <BasketIcon className="size-7" />
            </motion.div>}
            <div data-item className="absolute flex size-16 items-center justify-center rounded-xl bg-brand-orange-dark text-white shadow-lg" style={{ left: flight.x - 32, top: flight.y - 32 }}>
              <BookIcon className="size-8" />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return { fly, layer };
}
