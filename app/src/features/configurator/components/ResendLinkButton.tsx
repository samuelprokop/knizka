"use client";

import { useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { resendLinkAction } from "../actions/child";
import { useToast } from "@/components/Toaster";
import { Button } from "./ui";

export function ResendLinkButton({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const toast = useToast();

  return (
    <Button
      pending={pending}
      disabled={sent}
      className="self-start"
      onClick={() =>
        start(async () => {
          await resendLinkAction(projectId);
          setSent(true);
          toast({ title: t("configurator.link.sent"), tone: "ok" });
        })
      }
    >
      {t("configurator.link.resend")}
    </Button>
  );
}
