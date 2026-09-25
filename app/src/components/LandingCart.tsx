"use client";

/*
  Košík na úvodnej stránke len pre toho, kto už má schválenú knihu v košíku
  (návrat k rozpracovanému nákupu – Zeigarnikov efekt). Nový návštevník ho nevidí:
  jediná výzva ostáva „Vytvoriť knihu“ (Hickov zákon). Stav sa načíta po zobrazení,
  úvodná stránka ostáva statická.
*/

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { EASE } from "@/lib/motion";
import { HeaderCart } from "./HeaderCart";

export function LandingCart() {
  const { market } = useI18n();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/${market}/kosik/stav`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { href: null }))
      .then((data: { href: string | null }) => alive && setHref(data.href))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [market]);

  return (
    <AnimatePresence>
      {href && (
        <motion.div initial={{ opacity: 0, scale: 0.8, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE.out }}>
          <HeaderCart href={href} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
