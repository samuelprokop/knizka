"use client";

import { useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { sendLinkAction } from "../actions/child";
import { CheckIcon } from "@/components/icons";

/** „Uložiť a pokračovať neskôr“ – pošle nový odkaz na e-mail projektu. */
export function SaveExitButton({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await sendLinkAction(projectId);
          setDone(result.ok);
        })
      }
      className="min-h-11 rounded-full px-3 text-sm font-medium text-ink/75 underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40"
    >
      <span aria-live="polite" className="flex items-center gap-1.5">
        {done && <CheckIcon className="size-4 text-[#1f7a3a]" />}
        {done ? t("configurator.saved_link_sent") : t("common.save_exit")}
      </span>
    </button>
  );
}
