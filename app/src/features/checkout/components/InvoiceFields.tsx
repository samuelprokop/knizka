"use client";

/*
  Faktúra na firmu v pokladni: zaškrtnutie otvorí okno s údajmi firmy (stránka
  sa nepredĺži). Okno je vnútri formulára objednávky, takže sa údaje odošlú
  s ňou; po uložení sa pod políčkom ukáže súhrn s možnosťou úpravy.
*/

import { useId, useRef, useState } from "react";

import { CloseIcon } from "@/components/icons";
import { Field, inputClass } from "@/features/configurator/components/ui";
import { useI18n } from "@/i18n/client";

export function InvoiceFields() {
  const { t } = useI18n();
  const ids = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [on, setOn] = useState(false);
  const [company, setCompany] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");

  const open = () => dialogRef.current?.showModal();
  const close = () => {
    dialogRef.current?.close();
    // Bez vyplneného názvu firmy faktúru nechceme – políčko sa vráti.
    if (!company.trim()) setOn(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="invoiceToggle"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            if (e.target.checked) open();
          }}
          className="size-6 accent-brand-orange-dark"
        />
        <span className="text-base text-ink">{t("checkout.invoice.toggle")}</span>
      </label>
      {on && company.trim() && (
        <p className="ml-9 flex flex-wrap items-center gap-x-3 text-sm text-ink/70">
          {[company, ico && `${t("checkout.invoice.ico")} ${ico}`, dic && `${t("checkout.invoice.dic")} ${dic}`].filter(Boolean).join(" · ")}
          <button type="button" onClick={open} className="font-semibold text-brand-orange-dark underline-offset-4 hover:underline">
            {t("common.edit")}
          </button>
        </p>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        onCancel={close}
        className="m-auto w-[min(100vw-2rem,28rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">
              {t("checkout.invoice.toggle")}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close")}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 outline-none hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <Field label={t("checkout.invoice.company")} htmlFor={`${ids}-company`}>
            <input id={`${ids}-company`} name="invoiceCompanyName" autoComplete="organization" autoFocus value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("checkout.invoice.ico")} htmlFor={`${ids}-ico`}>
              <input id={`${ids}-ico`} name="invoiceIco" inputMode="numeric" value={ico} onChange={(e) => setIco(e.target.value)} className={inputClass} />
            </Field>
            <Field label={t("checkout.invoice.dic")} htmlFor={`${ids}-dic`}>
              <input id={`${ids}-dic`} name="invoiceDic" value={dic} onChange={(e) => setDic(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex min-h-12 items-center justify-center rounded-full bg-brand-orange-dark px-6 font-semibold text-white outline-none hover:bg-[#9a3500] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            {t("checkout.invoice.save")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
