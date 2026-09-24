"use client";

import { ToastProvider, useToast } from "@/components/Toaster";
import { I18nProvider, useI18n } from "@/i18n/client";

/* Ukážka notifikácií s ozajstnými textami aplikácie – každé kliknutie pridá ďalšiu. */
export function ToastDemo() {
  return (
    <I18nProvider market="sk" language="sk">
      <ToastProvider>
        <Buttons />
      </ToastProvider>
    </I18nProvider>
  );
}

let index = 0;

function Buttons() {
  const { t } = useI18n();
  const toast = useToast();
  const samples = [
    { title: t("hero.approved.toast"), tone: "ok" as const },
    { title: t("configurator.saved_link_sent"), tone: "ok" as const },
    { title: t("common.ui_preview"), tone: "info" as const },
    { title: t("error.generic"), tone: "error" as const },
  ];
  return (
    <button
      type="button"
      onClick={() => toast(samples[index++ % samples.length])}
      className="min-h-12 rounded-full bg-brand-orange-dark px-6 font-semibold text-white outline-none hover:bg-[#9a3500] focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98]"
    >
      Pridať notifikáciu
    </button>
  );
}
