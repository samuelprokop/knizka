import type { PaymentMethod } from "@/config/markets";
import type { Translator } from "@/i18n/format";

/*
  Výber platby v pokladnici – podľa „Express Wallets“ (21st.dev, @flx): rýchle
  peňaženky navrchu, pod nimi karta a ďalšie spôsoby. Každé tlačidlo je
  odosielacie (name="paymentMethod"), takže výber = odoslanie objednávky;
  funguje aj bez JavaScriptu a povinné polia formulára sa overia prehliadačom.

  PLACEHOLDER: tlačidlá Apple Pay a Google Pay sú zatiaľ vlastné. So skutočnou
  bránou ich nahradia oficiálne tlačidlá (Apple Pay JS / Google Pay API) a Apple
  Pay sa ukáže len na zariadeniach, ktoré ho podporujú. Karta sa rozbalí do
  formulára s náhľadom karty (CardPaymentForm) – jeho polia sa na náš server
  nikdy neodošlú (PCI DSS).
*/

import { CardPaymentForm } from "./CardPaymentForm";

const focusRing = "outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40";
const pressable = "transition active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

export function PaymentPanel({
  methods,
  total,
  t,
  cardOpen = false,
}: {
  methods: PaymentMethod[];
  total: string;
  t: Translator;
  /** Formulár karty rozbalený hneď (odkaz z katalógu UI). */
  cardOpen?: boolean;
}) {
  const has = (m: PaymentMethod) => methods.includes(m);
  const wallets = has("apple_pay") || has("google_pay");
  const others = methods.filter((m) => m === "bank_button" || m === "cod");

  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="payment-title" className="font-heading text-xl font-extrabold text-ink">
          {t("checkout.payment")}
        </h2>
        <span className="text-lg font-semibold text-ink tabular-nums">{total}</span>
      </div>

      {has("apple_pay") && (
        <button
          type="submit"
          name="paymentMethod"
          value="apple_pay"
          aria-label={t("checkout.pay.wallet", { method: t("checkout.payment.apple_pay") })}
          className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-black text-lg font-semibold text-white hover:bg-black/85 ${pressable} ${focusRing}`}
        >
          <AppleLogo />
          <span aria-hidden>Pay</span>
        </button>
      )}
      {has("google_pay") && (
        <button
          type="submit"
          name="paymentMethod"
          value="google_pay"
          aria-label={t("checkout.pay.wallet", { method: t("checkout.payment.google_pay") })}
          className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold text-ink shadow-sm ring-1 ring-ink/15 hover:bg-ink/[0.03] ${pressable} ${focusRing}`}
        >
          <GoogleLogo />
          <span aria-hidden>Pay</span>
        </button>
      )}

      {wallets && has("card") && (
        <div className="flex items-center gap-3 text-sm text-ink/60" role="separator">
          <span aria-hidden className="h-px flex-1 bg-ink/10" />
          {t("checkout.pay.divider")}
          <span aria-hidden className="h-px flex-1 bg-ink/10" />
        </div>
      )}

      {has("card") && <CardPaymentForm total={total} defaultOpen={cardOpen} />}

      {others.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-sm font-medium text-ink/60">{t("checkout.pay.other")}</p>
          <div className={`grid gap-2 ${others.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {others.map((method) => (
              <button
                key={method}
                type="submit"
                name="paymentMethod"
                value={method}
                className={`flex min-h-11 items-center justify-center rounded-2xl px-3 py-2 text-sm font-semibold text-ink ring-1 ring-ink/15 hover:bg-ink/[0.03] ${pressable} ${focusRing}`}
              >
                {t(method === "cod" ? "checkout.pay.cod" : "checkout.pay.bank")}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink/60">{t("checkout.pay.note")}</p>
    </section>
  );
}

// ---------------------------------------------------------------- značky a ikony

function AppleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 384 512" className="size-5 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
