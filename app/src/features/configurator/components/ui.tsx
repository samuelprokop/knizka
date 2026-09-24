/*
  Základné ovládacie prvky konfigurátora. Mobil na prvom mieste (N1):
  dotykové plochy aspoň 48 px, viditeľné zameranie, kontrast WCAG AA (N9).
*/

import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";

import { NextArrow } from "@/components/buttons";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "@/components/icons";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const FOCUS = "outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40";

/** "next" = hlavná akcia kroku (Pokračovať) – s NextArrow za textom. */
type Variant = "primary" | "next" | "secondary" | "ghost";

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS,
    variant === "primary" && "bg-brand-orange-dark text-white hover:bg-[#9a3500] active:scale-[0.98]",
    variant === "next" && "group bg-linear-to-r from-brand-orange-dark to-[#8f3100] text-white shadow-md shadow-brand-orange/20 hover:from-[#9a3500] active:scale-[0.98] motion-reduce:active:scale-100",
    variant === "secondary" && "border-2 border-ink/15 bg-white text-ink hover:border-ink/35",
    variant === "ghost" && "px-3 text-ink/70 underline-offset-4 hover:text-ink hover:underline",
    extra
  );
}

export function Button({
  variant = "primary",
  className,
  pending,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || pending} aria-busy={pending || undefined} className={buttonClass(variant, className)}>
      {pending && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
      {variant === "next" && !pending && <NextArrow />}
    </button>
  );
}

/**
 * Výberový čip / dlaždica s aria-pressed (prepínač v skupine).
 * shape="pill" = krátka voľba v rade (pohlavie, vek, jazyk), inak dlaždica.
 */
export function Chip({
  selected,
  shape = "tile",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; shape?: "pill" | "tile" }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cx(
        "min-h-12 px-4 py-2 text-base transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100",
        shape === "pill" ? "rounded-full px-5" : "rounded-2xl",
        !className?.includes("text-center") && "text-left",
        FOCUS,
        selected
          ? "bg-brand-orange/10 font-semibold text-ink ring-2 ring-brand-orange"
          : "bg-white font-medium text-ink shadow-[0_1px_2px_rgb(23_20_15/0.06)] ring-1 ring-ink/12 hover:ring-ink/30",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * Pole s popisom nad sebou, pomocným textom a chybou pod sebou. Pomocný text
 * a chyba sa na pole naviažu cez aria-describedby (ak je dieťa jeden prvok s htmlFor).
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  optional,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  error?: ReactNode;
  /** Text „nepovinné“ vedľa popisu. */
  optional?: ReactNode;
  children: ReactNode;
}) {
  const helpId = htmlFor && help ? `${htmlFor}-help` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [errorId, !error ? helpId : undefined].filter(Boolean).join(" ") || undefined;
  const control =
    describedBy && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") })
      : children;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink/55">{optional}</span>}
      </label>
      {control}
      {help && !error && (
        <p id={helpId} className="text-sm text-ink/65">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-[#b3261e]">
          <AlertIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Chyba skupiny volieb (fieldset) – rovnaký vzhľad ako chyba poľa. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-[#b3261e]">
      <AlertIcon className="mt-px size-4 shrink-0" />
      {children}
    </p>
  );
}

/*
  Vstupné pole: jemný rámik a vnútorný tieň; pri zameraní oranžový rámik,
  prstenec a nádych; chyba (aria-invalid) červená; zablokované sivé.
  Trieda „field“ dáva výberom (select) vlastnú šípku (globals.css).
*/
export const inputClass = cx(
  "field min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-4 text-base text-ink outline-none placeholder:text-ink/40",
  "shadow-[inset_0_1px_2px_rgb(23_20_15/0.06)] transition-[border-color,box-shadow,background-color] duration-150",
  "hover:border-ink/30 focus:border-brand-orange focus:bg-[#fffaf6] focus:ring-4 focus:ring-brand-orange/15",
  "aria-[invalid=true]:border-[#b3261e] aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-[#b3261e]/10",
  "disabled:cursor-not-allowed disabled:bg-ink/[0.04] disabled:text-ink/45"
);

export function Check({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="group flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl py-2">
      <span className="relative mt-px flex size-6 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={cx(
            "peer size-6 cursor-pointer appearance-none rounded-lg border-2 border-ink/25 bg-white transition-colors",
            "group-hover:border-ink/45 checked:border-brand-orange-dark checked:bg-brand-orange-dark",
            "disabled:cursor-not-allowed disabled:opacity-50",
            FOCUS
          )}
        />
        <CheckIcon className="pointer-events-none absolute inset-0.5 size-5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
      <span className="text-base leading-snug text-ink">{children}</span>
    </label>
  );
}

/** Prepínač áno/nie (role="switch"). */
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx("flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl py-2 text-left", FOCUS)}
    >
      <span className="flex flex-col">
        <span className="text-base text-ink">{label}</span>
        {hint && <span className="text-sm text-ink/60">{hint}</span>}
      </span>
      <span aria-hidden className={cx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-brand-orange-dark" : "bg-ink/20")}>
        <span className={cx("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok" | "error"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "bg-brand-teal/10 text-ink",
        tone === "warn" && "bg-[#fff1d6] text-ink",
        tone === "ok" && "bg-[#e3f4e6] text-ink",
        tone === "error" && "bg-[#fde8e6] text-[#8c1d15]"
      )}
    >
      {children}
    </div>
  );
}

export function StepTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-heading text-[2rem] leading-[1.1] font-extrabold text-balance text-ink sm:text-[2.1rem]">{title}</h1>
      {subtitle && <p className="text-base text-pretty text-ink/65">{subtitle}</p>}
    </header>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-ink/12 bg-white shadow-[0_1px_2px_rgb(23_20_15/0.05)]">
      <summary className={cx("flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-ink", FOCUS, "rounded-2xl")}>
        {summary}
        <ChevronDownIcon className="size-5 shrink-0 text-ink/60 transition group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

/** Rozdelí text možností zo slovníka „a · b · c“ na položky. */
export const splitOptions = (text: string) => text.split(" · ").map((s) => s.trim());
