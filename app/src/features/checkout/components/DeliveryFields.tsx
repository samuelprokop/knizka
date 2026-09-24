"use client";

/*
  Doručenie v pokladni: dopravca ako karty s cenou, pri výdajnom mieste
  výber miesta (nie písanie), pri kuriérovi adresa. Zmena dopravcu prepočíta
  súhrn (parameter carrier v URL, bez posunu stránky).

  PLACEHOLDER: výber výdajného miesta je zatiaľ ukážkový zoznam. So skutočným
  napojením ho nahradí widget dopravcu (Packeta / Zásilkovna: Packeta.Widget.pick,
  GLS ParcelShop) – ten vráti názov a adresu miesta do pickupPointLabel.
*/

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { CheckIcon, CloseIcon } from "@/components/icons";
import { Field, cx, inputClass } from "@/features/configurator/components/ui";
import { useI18n } from "@/i18n/client";

export type CarrierOption = { id: string; name: string; price: string; pickupPoint: boolean };

/** Ukážkové výdajné miesta (placeholder widgetu dopravcu). */
const SAMPLE_POINTS: Record<string, string[]> = {
  sk: ["Z-BOX Bratislava – Obchodná 5", "Packeta Point Trnava – Hlavná 12", "Z-BOX Košice – Hlavná 60"],
  cz: ["Z-BOX Praha 1 – Národní 10", "Zásilkovna Brno – Masarykova 3", "Z-BOX Ostrava – Stodolní 8"],
};

export function DeliveryFields({ carriers, defaultCarrierId }: { carriers: CarrierOption[]; defaultCarrierId: string | null }) {
  const { t, market } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ids = useId();
  const [carrierId, setCarrierId] = useState(defaultCarrierId ?? carriers[0]?.id ?? "");
  const [point, setPoint] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requiredRef = useRef<HTMLInputElement>(null);
  const carrier = carriers.find((c) => c.id === carrierId);

  // Povinné výdajné miesto: vlastná hláška prehliadača pri odoslaní bez výberu.
  useEffect(() => {
    requiredRef.current?.setCustomValidity(carrier?.pickupPoint && !point ? t("checkout.pickup.required") : "");
  }, [carrier, point, t]);

  const pick = (id: string) => {
    setCarrierId(id);
    setPoint("");
    const next = new URLSearchParams(params);
    next.set("carrier", id);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-sm font-semibold text-ink">{t("checkout.carrier")}</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {carriers.map((c) => {
            const selected = c.id === carrierId;
            return (
              <label
                key={c.id}
                className={cx(
                  "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 transition-[box-shadow,background-color]",
                  "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-orange/40",
                  selected ? "bg-brand-orange/10 ring-2 ring-brand-orange" : "shadow-[0_1px_2px_rgb(23_20_15/0.06)] ring-1 ring-ink/12 hover:ring-ink/30"
                )}
              >
                <input type="radio" name="carrierId" value={c.id} checked={selected} onChange={() => pick(c.id)} className="sr-only" />
                <span
                  aria-hidden
                  className={cx(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-brand-orange-dark bg-brand-orange-dark text-white" : "border-ink/25 bg-white"
                  )}
                >
                  {selected && <CheckIcon className="size-3.5" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="text-sm text-ink/65">{t(c.pickupPoint ? "checkout.carrier.pickup" : "checkout.carrier.home")}</span>
                </span>
                <span className="text-sm font-semibold text-ink tabular-nums">{c.price}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label={t("checkout.address.name")} htmlFor="addressName">
        <input id="addressName" name="addressName" required autoComplete="name" className={inputClass} />
      </Field>

      {carrier?.pickupPoint ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">{t("checkout.shipping.pickup")}</span>
          <input type="hidden" name="pickupPointLabel" value={point} />
          {/* Nosič povinnosti pre kontrolu formulára prehliadačom (skrytý, nie zameriteľný). */}
          <input ref={requiredRef} required value={point} onChange={() => {}} tabIndex={-1} aria-hidden className="sr-only" />
          {point ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/12">
              <span className="text-ink">{point}</span>
              <button type="button" onClick={() => dialogRef.current?.showModal()} className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-brand-orange-dark underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                {t("checkout.pickup.change")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-white px-4 font-semibold text-ink transition outline-none hover:border-ink/40 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
            >
              <PinIcon />
              {t("checkout.pickup.choose")}
            </button>
          )}
        </div>
      ) : (
        <>
          <Field label={t("checkout.address.street")} htmlFor="addressStreet">
            <input id="addressStreet" name="addressStreet" required autoComplete="street-address" className={inputClass} />
          </Field>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label={t("checkout.address.city")} htmlFor="addressCity">
              <input id="addressCity" name="addressCity" required autoComplete="address-level2" className={inputClass} />
            </Field>
            <Field label={t("checkout.address.zip")} htmlFor="addressZip">
              <input id="addressZip" name="addressZip" required inputMode="numeric" autoComplete="postal-code" className={inputClass} />
            </Field>
          </div>
        </>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        className="m-auto w-[min(100vw-2rem,26rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">
              {t("checkout.pickup.dialog_title", { carrier: carrier?.name ?? "" })}
            </h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={t("common.close")} className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              <CloseIcon className="size-5" />
            </button>
          </div>
          <p className="rounded-xl bg-brand-teal/10 px-3 py-2 text-sm text-ink/80">{t("checkout.pickup.placeholder_note")}</p>
          <ul className="flex flex-col gap-2">
            {(SAMPLE_POINTS[market] ?? SAMPLE_POINTS.sk).map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => {
                    setPoint(p);
                    dialogRef.current?.close();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left ring-1 ring-ink/12 transition outline-none hover:bg-ink/[0.03] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  <PinIcon />
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-brand-orange-dark">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
