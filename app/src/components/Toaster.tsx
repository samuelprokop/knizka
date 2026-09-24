"use client";

/*
  Notifikácie (toasty) – vlastná implementácia podľa príkladu „Toast:
  Notifications list“ (motion.dev, zdroj je v Motion+): karty s nadpisom,
  popisom a zatvorením; nová vojde, ostatné sa plynulo posunú (layout
  animácie), zatvorená zmizne a zoznam sa zlepí.

    const toast = useToast();
    toast({ title: t("…"), description: t("…"), tone: "ok" });

  Len na krátke potvrdenia („Odkaz sme poslali“). Chyby formulárov patria
  k poľu, nie sem. Prístupnosť: oblasť aria-live="polite", fokus sa
  nepresúva, zmiznú po 5 s (pri prejdení myšou alebo fokuse čakajú),
  zatváracie tlačidlo 44 px. Na mobile hore, od tabletu vpravo dole.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import { AlertIcon, CheckIcon, CloseIcon } from "./icons";

type Tone = "ok" | "info" | "error";
export type ToastInput = { title: string; description?: string; tone?: Tone };
type Toast = ToastInput & { id: number };

const DURATION_MS = 5000;
const MAX_VISIBLE = 3;

const ToastCtx = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast() {
  const push = useContext(ToastCtx);
  if (!push) throw new Error("useToast musí byť vnútri <ToastProvider>");
  return push;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const closeLabel = t("common.close");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduceMotion = useReducedMotion();

  const push = useCallback((toast: ToastInput) => {
    setToasts((list) => [...list, { ...toast, id: nextId++ }].slice(-MAX_VISIBLE));
  }, []);
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:w-96 sm:flex-col-reverse sm:items-stretch sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} closeLabel={closeLabel} reduceMotion={!!reduceMotion} />
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  closeLabel,
  reduceMotion,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
  closeLabel: string;
  reduceMotion: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS);

  // Odpočet sa pri prejdení myšou / fokuse zastaví a potom pokračuje.
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, onDismiss, toast.id]);

  const tone = toast.tone ?? "ok";
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 460, damping: 34 };

  return (
    <motion.div
      layout={!reduceMotion}
      role="status"
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: reduceMotion ? 0 : 0.16 } }}
      transition={spring}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white py-3 pr-1 pl-4 shadow-xl shadow-ink/10 ring-1 ring-ink/10 sm:max-w-none"
    >
      <span
        aria-hidden
        className={
          "flex size-7 shrink-0 items-center justify-center rounded-full " +
          (tone === "ok" ? "bg-[#e3f4e6] text-[#1f7a3a]" : tone === "error" ? "bg-[#fde8e6] text-[#b3261e]" : "bg-brand-teal/15 text-[#006b68]")
        }
      >
        {tone === "ok" ? <CheckIcon className="size-4" /> : <AlertIcon className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm leading-snug text-ink/65">{toast.description}</p>}
      </div>
      <motion.button
        type="button"
        onClick={() => onDismiss(toast.id)}
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        aria-label={closeLabel}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink/50 transition-colors outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
      >
        <CloseIcon className="size-4" />
      </motion.button>
    </motion.div>
  );
}

/** Ukáže notifikáciu raz po načítaní (napr. potvrdenie po presmerovaní). */
export function ToastOnMount(props: ToastInput) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(props);
  }, [toast, props]);
  return null;
}
