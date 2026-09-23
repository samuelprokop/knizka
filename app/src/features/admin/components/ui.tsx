/*
  Základné prvky administrácie – hutnejšie a menej dekoratívne než zákaznícke UI
  (interný nástroj), no zdieľajú farby značky (globals.css) pre konzistenciu.
*/

import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const FOCUS = "outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS,
    variant === "primary" && "bg-brand-orange-dark text-white hover:bg-[#9a3500]",
    variant === "secondary" && "border border-ink/20 bg-white text-ink hover:border-ink/40",
    variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
    variant === "ghost" && "px-2 text-ink/70 underline-offset-4 hover:text-ink hover:underline",
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
      {pending && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, hint, children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} {...props} className="text-sm font-medium text-ink/80">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

const fieldClass = "min-h-10 rounded-lg border border-ink/20 bg-white px-3 text-sm text-ink " + FOCUS;

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldClass, "py-2", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldClass, props.className)} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    info: "border-ink/15 bg-ink/5 text-ink",
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
  } as const;
  return <div className={cx("rounded-lg border px-3 py-2 text-sm", tones[tone])} role="status">{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "warning" | "danger" | "success"; children: ReactNode }) {
  const tones = {
    neutral: "bg-ink/10 text-ink",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    success: "bg-emerald-100 text-emerald-800",
  } as const;
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-ink/10 bg-white p-4", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
