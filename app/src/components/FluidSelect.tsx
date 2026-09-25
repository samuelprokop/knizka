"use client";

/*
  Rozbaľovací výber podľa „Fluid Dropdown“ (21st.dev, koustubhayadiyala36),
  prekreslený do farieb TAKTIK: tlačidlo v tvare poľa formulára, pod ním zoznam
  s ikonami a zvýraznením, ktoré plynulo prechádza medzi položkami (layoutId).

  Prístupnosť (vzor listbox, WAI-ARIA APG): tlačidlo má aria-haspopup/expanded,
  zoznam je role="listbox" s aria-activedescendant; šípky hore/dole, Home/End,
  Enter/medzerník vyberie, Escape zavrie a vráti zameranie na tlačidlo.
  Keď pod poľom nie je dosť miesta, zoznam sa otvorí nahor (stránka sa neposúva).
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { CheckIcon, ChevronDownIcon } from "./icons";

export type FluidOption = { value: string; label: string; icon?: ReactNode };

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function FluidSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
  labelledBy,
  name,
}: {
  id: string;
  value: string | null;
  options: FluidOption[];
  onChange: (value: string) => void;
  placeholder: string;
  /** id viditeľného popisu poľa (label). */
  labelledBy: string;
  /** Pre odoslanie vo formulári (skryté pole s hodnotou). */
  name?: string;
}) {
  const reduce = useReducedMotion();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value) ?? null;

  const show = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    // Výška zoznamu ≈ položky po 2.75rem + okraje. Spodná hranica je lepiaca lišta kroku
    // (cena, Pokračovať), ak je na stránke – zoznam ju nesmie prekryť; inak okraj okna.
    const needed = options.length * 44 + 24;
    const footer = document.querySelector("[data-step-footer]")?.getBoundingClientRect();
    const floor = footer ? Math.min(footer.top, window.innerHeight) : window.innerHeight;
    if (rect) setUp(floor - rect.bottom < needed && rect.top > needed);
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    onChange(options[index].value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close(event.key === "Escape");
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelledBy} ${id}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className={cx(
          "flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-base transition-[box-shadow] outline-none",
          "shadow-[0_1px_2px_rgb(23_20_15/0.06)] ring-1 ring-ink/15 hover:ring-ink/30 focus-visible:ring-4 focus-visible:ring-brand-orange/40",
          open && "ring-2 ring-brand-orange"
        )}
      >
        {selected?.icon && <span className="text-brand-orange-dark">{selected.icon}</span>}
        <span className={cx("flex-1 truncate", selected ? "text-ink" : "text-ink/50")}>{selected?.label ?? placeholder}</span>
        <ChevronDownIcon className={cx("size-5 text-ink/60 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelledBy}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKey}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: up ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: up ? 4 : -4, transition: { duration: 0.12 } }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            style={{ transformOrigin: up ? "bottom" : "top" }}
            className={cx(
              "absolute inset-x-0 z-30 flex flex-col rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-ink/10 outline-none",
              up ? "bottom-full mb-2" : "top-full mt-2"
            )}
          >
            {options.map((option, i) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cx("relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-base", isSelected ? "font-semibold text-ink" : "text-ink/80")}
                >
                  {/* Zvýraznenie „tečie“ za ukazovateľom / klávesnicou. */}
                  {active === i && (
                    <motion.span
                      layoutId={`${listId}-highlight`}
                      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.25, bounce: 0.1 }}
                      className="absolute inset-0 -z-0 rounded-xl bg-brand-orange/10"
                    />
                  )}
                  {option.icon && <span className={cx("relative transition-colors", active === i ? "text-brand-orange-dark" : "text-ink/45")}>{option.icon}</span>}
                  <span className="relative flex-1">{option.label}</span>
                  {isSelected && <CheckIcon className="relative size-4 text-brand-orange-dark" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
