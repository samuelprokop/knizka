"use client";

import { useState, useTransition } from "react";

import { Skeleton, SkeletonReveal } from "@/components/Skeleton";
import { useI18n } from "@/i18n/client";
import { notifyWhenReadyAction } from "../../actions/book";
import { AutoRefresh } from "../AutoRefresh";
import { StepFooter } from "../StepFooter";
import { Button, Notice, StepTitle } from "../ui";
import { useWizard } from "../WizardContext";
import { useToast } from "@/components/Toaster";
import { pluralForm } from "@/i18n/plural";

export type PageThumb = { id: string; position: number; status: string; url: string | null; text: string | null };

/** Krok 7: kniha sa skladá pred očami po dvojstranách; hotové sa dajú listovať (K7.1). */
export function GeneratingStep({ pages, maskedEmail }: { pages: PageThumb[]; maskedEmail: string }) {
  const { t } = useI18n();
  const { projectId, hero, bookLanguage } = useWizard();
  const [open, setOpen] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const toast = useToast();
  const [pending, start] = useTransition();

  const spreads = pages.filter((p) => p.position > 0);
  const done = spreads.filter((p) => p.status === "ready").length;
  const fixing = pages.find((p) => p.status === "needs_review");
  const remaining = pages.filter((p) => p.status !== "ready").length;
  const minutes = Math.max(1, Math.ceil(remaining * 0.1));
  const opened = pages.find((p) => p.id === open && p.url);

  return (
    <>
      <AutoRefresh active intervalMs={1200} />
      <StepTitle title={t("gen.title", undefined, hero ?? undefined)} />
      <div aria-live="polite" className="flex flex-col gap-1">
        <p className="text-base font-semibold">{t("gen.progress", { n: done, total: spreads.length })}</p>
        <p className="text-sm text-ink/70">{t(`gen.eta.${pluralForm(minutes)}`, { minutes })}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={spreads.length}
        aria-valuenow={done}
        aria-label={t("gen.progress", { n: done, total: spreads.length })}
        className="h-3 overflow-hidden rounded-full bg-ink/10"
      >
        <div className="h-full rounded-full bg-brand-orange-dark transition-all" style={{ width: `${(done / Math.max(1, spreads.length)) * 100}%` }} />
      </div>

      <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
        {pages.map((p) => (
          <li key={p.id} className="shrink-0 snap-start">
            <button
              type="button"
              disabled={p.status !== "ready"}
              onClick={() => setOpen(p.id)}
              aria-label={p.position === 0 ? t("configurator.preview.cover") : t("text.spread", { n: p.position })}
              className="block h-16 w-28 overflow-hidden rounded-xl ring-1 ring-ink/10 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
            >
              <SkeletonReveal
                className="h-full w-full"
                loading={p.status !== "ready" || !p.url}
                skeleton={<Skeleton className="h-16 w-28 rounded-none" />}
              >
                {p.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
                  <img src={p.url} alt="" className="h-16 w-28 object-cover" />
                )}
              </SkeletonReveal>
            </button>
          </li>
        ))}
      </ol>
      {done > 0 && <p className="text-sm text-ink/70">{t("gen.browse")}</p>}
      {fixing && <Notice tone="warn">{t("gen.fixing_page", { n: fixing.position })}</Notice>}

      {opened && (
        <figure className="flex flex-col gap-2 rounded-3xl bg-white p-3 ring-1 ring-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu */}
          <img src={opened.url!} alt="" className="w-full rounded-2xl" />
          {opened.text && <figcaption lang={bookLanguage} className="font-heading text-lg">{opened.text}</figcaption>}
        </figure>
      )}

      <StepFooter>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={left}
          pending={pending}
          onClick={() =>
            start(async () => {
              const result = await notifyWhenReadyAction(projectId!);
              setLeft(result.ok);
              if (result.ok) toast({ title: t("gen.leave.confirm", { email: maskedEmail }), tone: "ok" });
            })
          }
        >
          {t("gen.leave")}
        </Button>
      </StepFooter>
    </>
  );
}
