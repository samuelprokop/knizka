"use client";

/*
  Zľavový kód v košíku: tlačidlo „Máte zľavový kód?“ otvorí okno s poľom.
  Uplatnenie je GET formulár – košík drží všetky voľby v URL, kód sa k nim
  pridá. Pri neplatnom kóde sa okno po načítaní otvorí znova s chybou pri poli.
*/

import { useEffect, useId, useRef } from "react";

import { CloseIcon } from "@/components/icons";
import { Field, inputClass } from "@/features/configurator/components/ui";
import { useI18n } from "@/i18n/client";

export function VoucherDialog({
  action,
  hidden,
  defaultCode,
  error,
}: {
  action: string;
  /** Ostatné voľby košíka, ktoré sa s kódom odošlú. */
  hidden: Record<string, string>;
  defaultCode: string;
  /** Preložená chyba neplatného kódu – okno sa vtedy otvorí samo. */
  error: string | null;
}) {
  const { t } = useI18n();
  const ids = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error) dialogRef.current?.showModal();
  }, [error]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="self-start rounded-full text-sm font-semibold text-brand-orange-dark underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40"
      >
        {t("cart.voucher.open")}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        className="m-auto w-[min(100vw-2rem,26rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <form method="get" action={action} className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">
              {t("cart.code")}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("common.close")}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Field label={t("voucher.enter")} htmlFor={`${ids}-code`} error={error}>
            <input
              id={`${ids}-code`}
              name="voucher"
              defaultValue={defaultCode}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              autoFocus
              aria-invalid={!!error || undefined}
              className={`${inputClass} uppercase`}
            />
          </Field>
          <button
            type="submit"
            className="flex min-h-12 items-center justify-center rounded-full bg-brand-orange-dark px-6 font-semibold text-white outline-none hover:bg-[#9a3500] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            {t("cart.voucher.apply")}
          </button>
        </form>
      </dialog>
    </>
  );
}
