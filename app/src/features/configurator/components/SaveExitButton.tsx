"use client";

import { useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { sendLinkAction } from "../actions/child";
import { useToast } from "@/components/Toaster";

/** „Uložiť a pokračovať neskôr“ – pošle nový odkaz na e-mail projektu. */
export function SaveExitButton({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await sendLinkAction(projectId);
          toast(
            result.ok
              ? { title: t("configurator.saved_link_sent"), tone: "ok" }
              : { title: t(result.error ?? "error.generic"), tone: "error" }
          );
        })
      }
      aria-busy={pending || undefined}
      className="min-h-11 rounded-full px-3 text-sm font-medium text-ink/75 underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40"
    >
      {/* Krátky popis v hlavičke (pás priebehu sa nesmie zalomiť), celé znenie zo slovníka v title. */}
      <span title={t("common.save_exit")}>{t("common.save_exit.short")}</span>
    </button>
  );
}
