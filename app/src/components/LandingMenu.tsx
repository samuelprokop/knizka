"use client";

/*
  Menu úvodnej stránky podľa „Fluid Menu“ (21st.dev, deepaksslibra, MIT): okrúhle
  tlačidlo, z ktorého sa pri otvorení „vylejú“ ďalšie kruhy pod seba (ikona menu sa
  pretočí na krížik). Schováva všetko, čo nový návštevník hneď nepotrebuje – jediná
  výzva na stránke ostáva „Vytvoriť knihu“ (Hickov zákon):
    - košík (ak je v ňom schválená kniha – bodka na tlačidle to prezradí aj zatvorené),
    - návrat k rozpracovanej knihe (Zeigarnikov efekt – nedokončené ťahá späť),
    - časté otázky, kontakt a druhý trh (SK ↔ CZ).
  Pri každom kruhu je viditeľný popis (nie len ikona a nie len pri hover – N9).
  Stav košíka a rozpracovanej knihy sa načíta po zobrazení (stránka ostáva statická).
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import { pluralForm } from "@/i18n/plural";
import { EASE, SPRING } from "@/lib/motion";
import { BasketIcon, CloseIcon, GlobeIcon, MailIcon, MenuIcon, PencilIcon, QuestionIcon } from "./icons";

type Item = { key: string; label: string; icon: ReactNode; href: string | null; badge?: boolean; external?: boolean };

export function LandingMenu({ supportEmail }: { supportEmail: string }) {
  const { t, market } = useI18n();
  const reduce = useReducedMotion();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ cartHref: string | null; cartCount: number; continueHref: string | null }>({ cartHref: null, cartCount: 0, continueHref: null });

  useEffect(() => {
    let alive = true;
    fetch(`/${market}/kosik/stav`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data && setState(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [market]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const other = market === "sk" ? "cz" : "sk";
  const items: Item[] = [
    {
      key: "cart",
      label: state.cartHref ? t(`landing.menu.cart.${pluralForm(state.cartCount)}`, { n: state.cartCount }) : t("landing.menu.cart_empty"),
      icon: <BasketIcon className="size-5" />,
      href: state.cartHref,
      badge: !!state.cartHref,
    },
    ...(state.continueHref ? [{ key: "continue", label: t("landing.menu.continue"), icon: <PencilIcon className="size-5" />, href: state.continueHref }] : []),
    { key: "faq", label: t("landing.menu.faq"), icon: <QuestionIcon className="size-5" />, href: `/${market}/otazky` },
    { key: "contact", label: t("landing.menu.contact"), icon: <MailIcon className="size-5" />, href: `mailto:${supportEmail}`, external: true },
    { key: "market", label: t("landing.menu.market"), icon: <GlobeIcon className="size-5" />, href: `/${other}` },
  ];

  const circle = "flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-ink/10";

  return (
    <div ref={rootRef} className="relative" data-expanded={open}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? t("landing.menu.close") : t("landing.menu.open")}
        onClick={() => setOpen((v) => !v)}
        className={`${circle} relative z-10 outline-none transition-colors hover:bg-paper focus-visible:ring-4 focus-visible:ring-brand-orange/40`}
      >
        {/* Ikona menu sa pretočí na krížik (a späť). */}
        <MenuIcon className={`absolute size-6 transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none ${open ? "scale-0 rotate-180 opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
        <CloseIcon className={`absolute size-6 transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none ${open ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-180 opacity-0"}`} />
        {state.cartHref && !open && <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full bg-brand-orange-dark ring-2 ring-white" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul id={listId} className="absolute top-0 right-0 flex flex-col items-end" initial="closed" animate="open" exit="closed">
            {items.map((item, i) => {
              const content = (
                <>
                  <motion.span
                    variants={{ closed: { opacity: 0, x: 8 }, open: { opacity: 1, x: 0, transition: { delay: reduce ? 0 : 0.08 + i * 0.04, duration: 0.3, ease: EASE.out } } }}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink shadow-md ring-1 ring-ink/10"
                  >
                    {item.label}
                  </motion.span>
                  <span className={`${circle} relative transition-colors group-hover:bg-brand-orange/10 group-hover:text-brand-orange-dark`}>
                    {item.icon}
                    {item.badge && (
                      <span aria-hidden className="absolute top-1 right-0.5 flex size-4.5 items-center justify-center rounded-full bg-brand-orange-dark text-[0.6875rem] font-bold text-white">
                        {state.cartCount}
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                <motion.li
                  key={item.key}
                  // Kruhy sa „vylejú“ spod tlačidla: každý o kúsok ďalej, s pružinou.
                  variants={{
                    closed: { y: 0, opacity: 0, transition: { duration: 0.15, ease: EASE.in } },
                    open: { y: (i + 1) * 56, opacity: 1, transition: reduce ? { duration: 0 } : { ...SPRING.smooth, delay: i * 0.03 } },
                  }}
                  className="absolute top-0 right-0"
                >
                  {item.href ? (
                    item.external ? (
                      <a href={item.href} className="group flex items-center gap-2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                        {content}
                      </a>
                    ) : (
                      <Link href={item.href} onClick={() => setOpen(false)} className="group flex items-center gap-2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                        {content}
                      </Link>
                    )
                  ) : (
                    <span aria-disabled className="flex items-center gap-2 opacity-60">
                      {content}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
