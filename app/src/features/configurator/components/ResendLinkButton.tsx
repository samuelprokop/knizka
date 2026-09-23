"use client";

import { useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { resendLinkAction } from "../actions/child";
import { Button, Notice } from "./ui";

export function ResendLinkButton({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  if (sent) return <Notice tone="ok">{t("configurator.link.sent")}</Notice>;
  return (
    <Button
      pending={pending}
      className="self-start"
      onClick={() =>
        start(async () => {
          await resendLinkAction(projectId);
          setSent(true);
        })
      }
    >
      {t("configurator.link.resend")}
    </Button>
  );
}
