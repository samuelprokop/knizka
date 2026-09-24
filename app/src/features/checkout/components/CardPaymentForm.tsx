"use client";

/*
  Platba kartou v pokladnici – podľa „CreditCardForm“ (21st.dev, @rahil1202):
  živý náhľad karty (číslo so skrytým stredom, držiteľ, platnosť), zvýraznenie
  práve vypĺňaného údaja na karte a otočenie na zadnú stranu pri CVV.
  Tlačidlo platby je neaktívne, kým údaje nie sú úplné a správne.

  PCI DSS: polia NEMAJÚ atribút name, takže sa s formulárom objednávky nikdy
  neodošlú – na server ide len paymentMethod=card. So skutočnou bránou sa polia
  nahradia jej zabezpečenými poľami (iframe / hosted fields), ktoré vrátia token;
  náhľad karty zostane, bráne stačí posielať udalosti zmeny.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import { cx, Field, inputClass } from "@/features/configurator/components/ui";

type Brand = "visa" | "mastercard" | "amex" | null;
type FieldId = "number" | "holder" | "expiry" | "cvv";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

function detectBrand(digits: string): Brand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return null;
}

/** Skupiny číslic podľa typu karty (American Express 4-6-5, ostatné po 4). */
function groupsFor(brand: Brand) {
  return brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
}

function formatNumber(digits: string, brand: Brand) {
  const parts: string[] = [];
  let at = 0;
  for (const size of groupsFor(brand)) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  // Karty s 19 číslicami – zvyšok ako posledná skupina.
  if (at < digits.length) parts.push(digits.slice(at));
  return parts.join(" ");
}

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function CardPaymentForm({ total, defaultOpen = false }: { total: string; defaultOpen?: boolean }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const uid = useId();
  const submitRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(defaultOpen);
  const [digits, setDigits] = useState("");
  const [holder, setHolder] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [focused, setFocused] = useState<FieldId | null>(null);
  const [touched, setTouched] = useState<Record<FieldId, boolean>>({ number: false, holder: false, expiry: false, cvv: false });

  const now = new Date();
  const thisYear = now.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => String(thisYear + i));

  const brand = detectBrand(digits);
  const cvvLength = brand === "amex" ? 4 : 3;
  const maxDigits = brand === "amex" ? 15 : 19;

  const errors: Record<FieldId, boolean> = {
    number: !(digits.length >= (brand === "amex" ? 15 : 13) && luhn(digits)),
    holder: holder.trim().length < 3,
    expiry: !month || !year || Number(year) * 12 + Number(month) < thisYear * 12 + now.getMonth() + 1,
    cvv: cvv.length !== cvvLength,
  };
  const valid = !Object.values(errors).some(Boolean);
  const showError = (field: FieldId) => touched[field] && focused !== field && errors[field];
  const blur = (field: FieldId) => {
    setFocused(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Enter v poli karty nesmie odoslať formulár prvým tlačidlom (Apple Pay).
  const onEnter = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (valid && submitRef.current) submitRef.current.form?.requestSubmit(submitRef.current);
  };

  const panelId = `${uid}-card`;
  const ids = { number: `${uid}-number`, holder: `${uid}-holder`, month: `${uid}-month`, year: `${uid}-year`, cvv: `${uid}-cvv` };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex h-12 items-center justify-center gap-2.5 rounded-2xl text-base font-semibold text-ink ring-1 transition outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
          open ? "bg-brand-orange/10 ring-brand-orange/40" : "bg-ink/[0.04] ring-ink/10 hover:bg-ink/[0.07]"
        )}
      >
        <CardIcon />
        {t("checkout.pay.card")}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cx("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="card"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 pt-1">
              <CardPreview
                digits={digits}
                brand={brand}
                holder={holder}
                month={month}
                year={year}
                cvv={cvv}
                focused={focused}
                labels={{ holder: t("checkout.card.preview.holder"), expires: t("checkout.card.preview.expires") }}
              />

              <Field label={t("checkout.card.number")} htmlFor={ids.number} error={showError("number") && t("checkout.card.error.number")}>
                <input
                  id={ids.number}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  value={formatNumber(digits, brand)}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "");
                    setDigits(next.slice(0, detectBrand(next) === "amex" ? 15 : 19));
                  }}
                  maxLength={maxDigits + 4}
                  onFocus={() => setFocused("number")}
                  onBlur={() => blur("number")}
                  onKeyDown={onEnter}
                  aria-invalid={showError("number") || undefined}
                  className={cx(inputClass, "font-mono tracking-wider")}
                />
              </Field>

              <Field label={t("checkout.card.holder")} htmlFor={ids.holder} error={showError("holder") && t("checkout.card.error.holder")}>
                <input
                  id={ids.holder}
                  autoComplete="cc-name"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={t("checkout.card.holder_placeholder")}
                  value={holder}
                  onChange={(e) => setHolder(e.target.value.slice(0, 26))}
                  onFocus={() => setFocused("holder")}
                  onBlur={() => blur("holder")}
                  onKeyDown={onEnter}
                  aria-invalid={showError("holder") || undefined}
                  className={cx(inputClass, "uppercase placeholder:normal-case")}
                />
              </Field>

              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
                <fieldset className="col-span-2 flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">{t("checkout.card.expiry")}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      id={ids.month}
                      aria-label={t("checkout.card.month")}
                      autoComplete="cc-exp-month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      onFocus={() => setFocused("expiry")}
                      onBlur={() => blur("expiry")}
                      onKeyDown={onEnter}
                      aria-invalid={showError("expiry") || undefined}
                      className={cx(inputClass, "px-3")}
                    >
                      <option value="">{t("checkout.card.month_short")}</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      id={ids.year}
                      aria-label={t("checkout.card.year")}
                      autoComplete="cc-exp-year"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      onFocus={() => setFocused("expiry")}
                      onBlur={() => blur("expiry")}
                      onKeyDown={onEnter}
                      aria-invalid={showError("expiry") || undefined}
                      className={cx(inputClass, "px-3")}
                    >
                      <option value="">{t("checkout.card.year_short")}</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
                <Field label={t("checkout.card.cvv")} htmlFor={ids.cvv}>
                  <input
                    id={ids.cvv}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder={"•".repeat(cvvLength)}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, cvvLength))}
                    onFocus={() => setFocused("cvv")}
                    onBlur={() => blur("cvv")}
                    onKeyDown={onEnter}
                    aria-invalid={showError("cvv") || undefined}
                    aria-describedby={`${ids.cvv}-help`}
                    className={cx(inputClass, "px-3 font-mono tracking-widest")}
                  />
                </Field>
              </div>
              {(showError("expiry") || showError("cvv")) && (
                <p role="alert" className="-mt-2 text-sm font-medium text-[#b3261e]">
                  {showError("expiry") ? t("checkout.card.error.expiry") : t("checkout.card.error.cvv")}
                </p>
              )}
              <p id={`${ids.cvv}-help`} className="-mt-2 text-sm text-ink/65">
                {t("checkout.card.cvv_help")}
              </p>

              <button
                ref={submitRef}
                type="submit"
                name="paymentMethod"
                value="card"
                disabled={!valid}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-orange-dark px-6 text-base font-semibold text-white transition outline-none hover:bg-[#9a3500] focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/60 disabled:active:scale-100 motion-reduce:transition-none"
              >
                {valid && <LockIcon />}
                {valid ? t("checkout.card.submit", { price: total }) : t("checkout.card.incomplete")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- náhľad karty

function CardPreview({
  digits,
  brand,
  holder,
  month,
  year,
  cvv,
  focused,
  labels,
}: {
  digits: string;
  brand: Brand;
  holder: string;
  month: string;
  year: string;
  cvv: string;
  focused: FieldId | null;
  labels: { holder: string; expires: string };
}) {
  const reduceMotion = useReducedMotion();
  const flipped = focused === "cvv";

  // Sloty čísla: napísané číslice, stred skrytý hviezdičkami, zvyšok „#“.
  const groups = groupsFor(brand);
  const slots: string[][] = [];
  let at = 0;
  for (const size of groups) {
    const group: string[] = [];
    for (let i = 0; i < size; i++, at++) {
      const digit = digits[at];
      const hidden = at >= groups[0] && at < groups.slice(0, -1).reduce((a, b) => a + b, 0);
      group.push(digit === undefined ? "#" : hidden ? "*" : digit);
    }
    slots.push(group);
  }

  return (
    <div aria-hidden className="mx-auto w-full max-w-[22rem] [perspective:1200px]">
      <motion.div
        className="relative aspect-[1.586] w-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 22 }}
      >
        {/* Predná strana */}
        <CardFace>
          <div className="flex items-start justify-between">
            <ChipIcon />
            <BrandMark brand={brand} />
          </div>

          <FocusFrame active={focused === "number"}>
            <div className="flex gap-3 font-mono text-lg tracking-[0.12em] text-white sm:text-xl">
              {slots.map((group, g) => (
                <span key={g} className="flex">
                  {group.map((ch, i) => (
                    <AnimatedChar key={i} char={ch} dim={ch === "#"} />
                  ))}
                </span>
              ))}
            </div>
          </FocusFrame>

          <div className="flex items-end justify-between gap-4">
            <FocusFrame active={focused === "holder"} className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold tracking-wider text-white/55 uppercase">{labels.holder}</span>
              <span className="block truncate text-sm font-semibold tracking-wide text-white uppercase">{holder.trim() || "–"}</span>
            </FocusFrame>
            <FocusFrame active={focused === "expiry"} className="shrink-0 text-right">
              <span className="block text-[10px] font-semibold tracking-wider text-white/55 uppercase">{labels.expires}</span>
              <span className="block font-mono text-sm font-semibold text-white">
                {month || "MM"}/{year ? year.slice(-2) : "RR"}
              </span>
            </FocusFrame>
          </div>
        </CardFace>

        {/* Zadná strana */}
        <CardFace back>
          <span className="-mx-5 mt-1 block h-10 bg-black/70 sm:-mx-6" />
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-white/70 uppercase">CVV</span>
            <span className="flex h-9 w-full items-center justify-end rounded-md bg-white px-3 font-mono text-base tracking-[0.3em] text-ink ring-2 ring-brand-orange">
              {cvv ? "•".repeat(cvv.length) : ""}
            </span>
          </div>
          <div className="flex justify-end">
            <BrandMark brand={brand} />
          </div>
        </CardFace>
      </motion.div>
    </div>
  );
}

function CardFace({ back = false, children }: { back?: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-ink p-5 shadow-xl shadow-ink/25 [backface-visibility:hidden] sm:p-6",
        back && "[transform:rotateY(180deg)]"
      )}
    >
      {/* Rozmazaný oranžový prstenec – farby TAKTIK namiesto fialovej predlohy. */}
      <span className="pointer-events-none absolute -top-[45%] left-[30%] aspect-square w-[95%] rounded-full border-[18px] border-brand-orange/85 blur-lg" />
      <span className="pointer-events-none absolute -bottom-[60%] -left-[20%] aspect-square w-3/4 rounded-full bg-[#ffb07a]/30 blur-3xl" />
      <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/[0.07] to-transparent" />
      <div className="relative flex h-full flex-col justify-between">{children}</div>
    </div>
  );
}

/** Rámik okolo údaja na karte, ktorý sa práve vypĺňa – presúva sa medzi údajmi. */
function FocusFrame({ active, className, children }: { active: boolean; className?: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cx("relative", className)}>
      {active && (
        <motion.span
          layoutId="card-focus-frame"
          className="absolute -inset-x-2.5 -inset-y-1.5 rounded-xl bg-white/[0.06] ring-1 ring-white/50"
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function AnimatedChar({ char, dim }: { char: string; dim: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative inline-flex w-[0.62em] justify-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          className={dim ? "text-white/35" : undefined}
          initial={reduceMotion ? false : { y: "-70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { y: "70%", opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ---------------------------------------------------------------- značky a ikony

function BrandMark({ brand }: { brand: Brand }) {
  if (brand === "visa") return <span className="font-heading text-xl font-extrabold tracking-tight text-white italic">VISA</span>;
  if (brand === "amex") return <span className="rounded bg-[#2e77bc] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">AMEX</span>;
  if (brand === "mastercard")
    return (
      <span className="flex">
        <span className="size-7 rounded-full bg-[#eb001b]" />
        <span className="-ml-3 size-7 rounded-full bg-[#f79e1b]/90 mix-blend-screen" />
      </span>
    );
  return <span className="h-7 w-10 rounded-md bg-white/10 ring-1 ring-white/20" />;
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 40 30" className="h-7 w-9">
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill="#e9c77b" stroke="#b8923d" />
      <path d="M13 1v28M27 1v28M1 10h12m14 0h12M1 20h12m14 0h12" stroke="#b8923d" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="size-5">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className="size-4">
      <rect x="3" y="7" width="10" height="7" rx="1.8" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
