"use client";

/*
  Odstránenie knihy z košíka – deštruktívna akcia, preto s potvrdením v okne.
  Kniha sa nemaže: vráti sa do náhľadu a ostáva uložená (návrat cez menu úvodnej
  stránky alebo odkaz v e-maile). Po odstránení ide zákazník na úvodnú stránku.
*/

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { CloseIcon, TrashIcon } from "@/components/icons";
import { useToast } from "@/components/Toaster";
import { removeFromCartAction } from "@/features/configurator/actions/book";
import { Button, Notice } from "@/features/configurator/components/ui";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

export function RemoveFromCart({
  projectIds,
  title,
  all = false,
  after = "home",
}: {
  /** Jedna kniha alebo všetky v košíku (hromadné odstránenie). */
  projectIds: string[];
  title: string;
  all?: boolean;
  /** Po odstránení: na úvod (košík jednej knihy) alebo len obnoviť prehľad. */
  after?: "home" | "refresh";
}) {
  const { t, market } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const ids = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      {all ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            dialogRef.current?.showModal();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#b3261e] outline-none transition-colors hover:bg-[#fde8e6] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
        >
          <TrashIcon className="size-4" />
          {t("cart.remove.all")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            dialogRef.current?.showModal();
          }}
          aria-label={t("cart.remove.label", { title })}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink/55 outline-none transition-colors hover:bg-[#fde8e6] hover:text-[#b3261e] focus-visible:ring-4 focus-visible:ring-brand-orange/40"
        >
          <TrashIcon className="size-5" />
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        aria-describedby={`${ids}-body`}
        className="m-auto w-[min(100vw-2rem,26rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">
              {t(all ? "cart.remove.all_title" : "cart.remove.title")}
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
          <p id={`${ids}-body`} className="text-sm leading-relaxed text-ink/75">
            {t(all ? "cart.remove.all_body" : "cart.remove.body", { n: projectIds.length })}
          </p>
          {error && <Notice tone="error">{t(error)}</Notice>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" autoFocus onClick={() => dialogRef.current?.close()}>
              {t("cart.remove.keep")}
            </Button>
            <Button
              variant="danger"
              pending={pending}
              onClick={() =>
                start(async () => {
                  for (const id of projectIds) {
                    const result = await removeFromCartAction(id);
                    if (!result.ok) return setError(result.error);
                  }
                  dialogRef.current?.close();
                  toast({ title: t(all ? "cart.remove.all_done" : "cart.remove.done"), tone: "ok" });
                  if (after === "home") router.push(`/${market}`);
                  else router.refresh();
                })
              }
            >
              {t(all ? "cart.remove.all_confirm" : "cart.remove.confirm")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
