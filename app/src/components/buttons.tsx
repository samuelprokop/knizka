/*
  Tlačidlá s pohybom (podľa 21st.dev, prekreslené do farieb TAKTIK):

  - MotionCta     – hlavná výzva (úvodná stránka, košík): kruh so šípkou sa pri
                    prejdení myšou rozleje na celé tlačidlo. Na dotykových
                    zariadeniach (bez hover) je rovno vyplnené – výzva nesmie
                    závisieť od hover (N9).
  - NextArrow     – šípka v tmavom krúžku pre „Pokračovať“ vo formulári (Button variant="next"):
                    svetlooranžový podklad, pri hover celé tlačidlo stmavne.
  - ShowMoreButton – Zobraziť viac / menej so šípkou, aria-expanded + aria-controls.
  - GoBackButton  – jednoduché Späť (odkaz alebo tlačidlo), nekonkuruje hlavnej výzve.

  Rozmery MotionCta sú v em – veľkosť určí font-size (hero ho má v cqw).
  Pohyb je len ozdoba: pri prefers-reduced-motion sa stav prepne bez animácie.
*/

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { ArrowRightIcon, ChevronDownIcon, ChevronLeftIcon } from "./icons";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const EASE = "ease-[cubic-bezier(0.65,0,0.35,1)]";

export function MotionCta({ className, children, ...props }: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link
      {...props}
      className={cx(
        "group relative isolate inline-flex h-[3em] items-center rounded-full bg-brand-orange/12 pr-[1.5em] pl-[3.75em] font-semibold whitespace-nowrap text-ink",
        "outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] motion-reduce:active:scale-100",
        className
      )}
    >
      {/* Výplň: v pokoji kruh vľavo (šírka = výška), pri hover/zameraní sa roztiahne na celé tlačidlo. */}
      <span
        aria-hidden
        className={cx(
          "absolute inset-y-0 left-0 -z-10 w-[3em] rounded-full bg-brand-orange-dark shadow-md shadow-brand-orange/25",
          "transition-[width] duration-500 motion-reduce:transition-none",
          "group-hover:w-full group-focus-visible:w-full [@media(hover:none)]:w-full",
          EASE
        )}
      />
      <span aria-hidden className={cx("absolute inset-y-0 left-0 flex w-[3em] items-center justify-center text-white transition-transform duration-500 group-hover:translate-x-[0.35em] motion-reduce:transition-none", EASE)}>
        <ArrowRightIcon className="size-[1.15em]" />
      </span>
      <span className={cx("transition-colors duration-500 group-hover:text-white group-focus-visible:text-white [@media(hover:none)]:text-white motion-reduce:transition-none", EASE)}>
        {children}
      </span>
    </Link>
  );
}

/**
 * Šípka v krúžku za textom „Pokračovať“: pri hover odíde doprava a nová
 * pricestuje zľava (smer = ďalší krok). Rodič musí mať triedu `group`.
 */
export function NextArrow() {
  return (
    <span aria-hidden className="relative -mr-3.5 ml-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-orange-dark text-white transition-colors duration-300 group-hover:bg-white group-hover:text-brand-orange-dark group-disabled:bg-brand-orange-dark group-disabled:text-white motion-reduce:transition-none">
      <ArrowRightIcon className={cx("size-4 transition-transform duration-300 group-hover:translate-x-6 group-disabled:translate-x-0 motion-reduce:transition-none", EASE)} />
      <ArrowRightIcon className={cx("absolute size-4 -translate-x-6 transition-transform duration-300 group-hover:translate-x-0 group-disabled:-translate-x-6 motion-reduce:transition-none", EASE)} />
    </span>
  );
}

export function ShowMoreButton({
  expanded,
  onToggle,
  controls,
  more,
  less,
  className,
}: {
  expanded: boolean;
  onToggle: () => void;
  /** id obsahu, ktorý tlačidlo rozbaľuje. */
  controls: string;
  more: ReactNode;
  less: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink/75 transition-colors outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40",
        className
      )}
    >
      {expanded ? less : more}
      <ChevronDownIcon className={cx("size-4 transition-transform duration-300 motion-reduce:transition-none", expanded && "rotate-180")} />
    </button>
  );
}

const BACK = cx(
  "group inline-flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1.5 text-sm font-semibold text-ink/70 transition-colors",
  "outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
);

function BackChevron() {
  return <ChevronLeftIcon className="size-4 opacity-70 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" />;
}

/** Späť – s `href` odkaz, s `onClick` tlačidlo. */
export function GoBackButton({
  href,
  onClick,
  children,
  className,
}: { children: ReactNode; className?: string } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })) {
  if (href)
    return (
      <Link href={href} className={cx(BACK, className)}>
        <BackChevron />
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cx(BACK, className)}>
      <BackChevron />
      {children}
    </button>
  );
}
