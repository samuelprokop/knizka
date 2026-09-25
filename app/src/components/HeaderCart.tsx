"use client";

/*
  Košík v hlavičke. V konfigurátore je vždy (zákazník vidí, kam kniha smeruje);
  kým kniha nie je schválená, je prázdny a po ťuknutí / prejdení myšou povie, kedy
  sa doň kniha dostane. Po schválení ukazuje počet a vedie do košíka.
  data-cart-target = cieľ animácie vloženia do košíka (FlyToBasket).
*/

import Link from "next/link";
import { useId, useState } from "react";

import { useI18n } from "@/i18n/client";
import { BasketIcon } from "./icons";

const BASE =
  "relative flex size-11 shrink-0 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40";

export function HeaderCart({ href, count = href ? 1 : 0 }: { href: string | null; count?: number }) {
  const { t } = useI18n();
  const tipId = useId();
  const [open, setOpen] = useState(false);

  if (href)
    return (
      <Link href={href} data-cart-target aria-label={t("cart.header.full", { n: count })} className={BASE}>
        <BasketIcon className="size-6" />
        <span aria-hidden className="absolute top-1 right-0.5 flex size-4.5 items-center justify-center rounded-full bg-brand-orange-dark text-[0.6875rem] font-bold text-white">
          {count}
        </span>
      </Link>
    );

  return (
    <div className="group relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        data-cart-target
        aria-label={t("cart.header.empty_label")}
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={BASE + " text-ink/70"}
      >
        <BasketIcon className="size-6" />
      </button>
      <p
        id={tipId}
        role="tooltip"
        className={
          "absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl bg-white p-3 text-sm text-ink/80 shadow-xl ring-1 ring-ink/10 transition-[opacity,translate,visibility] duration-150 motion-reduce:transition-none " +
          (open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100")
        }
      >
        {t("cart.header.empty")}
      </p>
    </div>
  );
}
