/*
  Základné ovládacie prvky konfigurátora. Mobil na prvom mieste (N1):
  dotykové plochy aspoň 48 px, viditeľné zameranie, kontrast WCAG AA (N9).
*/

import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const FOCUS = "outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40";

type Variant = "primary" | "secondary" | "ghost";

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS,
    variant === "primary" && "bg-brand-orange-dark text-white hover:bg-[#9a3500] active:scale-[0.98]",
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
    </button>
  );
}

/** Výberový čip / dlaždica s aria-pressed (prepínač v skupine). */
export function Chip({
  selected,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cx(
        "min-h-12 rounded-2xl border-2 px-4 py-2 text-base font-medium transition",
        !className?.includes("text-center") && "text-left",
        FOCUS,
        selected ? "border-brand-orange bg-brand-orange/10 text-ink" : "border-ink/12 bg-white text-ink hover:border-ink/30",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, help, error, children }: { label: ReactNode; htmlFor?: string; help?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {help && !error && <p className="text-sm text-ink/65">{help}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-[#b3261e]">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = cx(
  "min-h-12 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-base text-ink placeholder:text-ink/40",
  "focus:border-brand-orange",
  FOCUS
);

export function Check({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl py-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-6 shrink-0 cursor-pointer rounded accent-brand-orange-dark"
      />
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
      <h1 className="font-heading text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="text-base text-ink/70">{subtitle}</p>}
    </header>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border-2 border-ink/10 bg-white">
      <summary className={cx("flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-ink", FOCUS, "rounded-2xl")}>
        {summary}
        <span aria-hidden className="transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

/** Rozdelí text možností zo slovníka „a · b · c“ na položky. */
export const splitOptions = (text: string) => text.split(" · ").map((s) => s.trim());
