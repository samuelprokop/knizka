"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { LIMITS } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { approveBookAction, reopenBookAction, savePersonalTextsAction } from "../../actions/book";
import type { PersonalTexts } from "../../model";
import { stepHref } from "../../steps";
import { StepFooter } from "../StepFooter";
import { Button, buttonClass, Check, Field, Notice, StepTitle, inputClass } from "../ui";
import { useWizard } from "../WizardContext";

export type ApproveSummary = {
  nameLine: string;
  sample: string;
  characters: string;
  story: string;
  look: string;
  edited: string | null;
  price: string;
};

const CHECKS = ["approve.check1", "approve.check2", "approve.check3"] as const satisfies readonly MessageKey[];

export function ApproveStep({
  texts,
  letterEnabled,
  summary,
  approved,
  cartHref,
}: {
  texts: Required<PersonalTexts>;
  letterEnabled: boolean;
  summary: ApproveSummary;
  approved: boolean;
  cartHref: string;
}) {
  const { t } = useI18n();
  const { market, projectId, bookLanguage } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [values, setValues] = useState(texts);
  const [checks, setChecks] = useState([false, false, false]);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  const set = (key: keyof PersonalTexts, value: string) => setValues({ ...values, [key]: value });
  const persist = () => start(async () => void (await savePersonalTextsAction(projectId!, values)));

  if (approved) {
    return (
      <>
        <StepTitle title={t("configurator.approved.title")} subtitle={t("configurator.approved.body")} />
        <Link href={cartHref} className={buttonClass("primary", "self-start")}>
          {t("configurator.approved.cart")}
        </Link>
        <Button
          variant="secondary"
          className="self-start"
          pending={pending}
          onClick={() =>
            start(async () => {
              await reopenBookAction(projectId!);
              router.push(stepHref(market, projectId!, 8));
            })
          }
        >
          {t("approve.back_to_edit")}
        </Button>
        <StepFooter />
      </>
    );
  }

  return (
    <>
      <StepTitle title={t("dedication.title")} />
      <div className="flex flex-col gap-4">
        <Field label={t("dedication.title")} htmlFor={`${ids}-ded`} help={t("editor.text.counter", { n: values.dedication.length, max: LIMITS.dedicationMaxChars })}>
          <textarea id={`${ids}-ded`} lang={bookLanguage} className={`${inputClass} min-h-24 py-3`} maxLength={LIMITS.dedicationMaxChars} value={values.dedication} onChange={(e) => set("dedication", e.target.value)} onBlur={persist} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("dedication.from")} htmlFor={`${ids}-from`}>
            <input id={`${ids}-from`} className={inputClass} maxLength={80} value={values.from} onChange={(e) => set("from", e.target.value)} onBlur={persist} />
          </Field>
          <Field label={t("dedication.date")} htmlFor={`${ids}-date`}>
            <input id={`${ids}-date`} className={inputClass} maxLength={60} value={values.date} onChange={(e) => set("date", e.target.value)} onBlur={persist} />
          </Field>
        </div>
        <figure className="rounded-3xl bg-paper-page p-6 text-center font-heading text-lg leading-relaxed ring-1 ring-ink/10" lang={bookLanguage} aria-label={t("configurator.approve.dedication_preview")}>
          <p>{values.dedication}</p>
          {(values.from || values.date) && <p className="mt-3 text-base text-ink/70">{[values.from, values.date].filter(Boolean).join(" · ")}</p>}
        </figure>
        {letterEnabled && (
          <Field label={t("dedication.letter")} htmlFor={`${ids}-letter`} help={t("editor.text.counter", { n: values.letter.length, max: LIMITS.parentLetterMaxChars })}>
            <textarea id={`${ids}-letter`} lang={bookLanguage} className={`${inputClass} min-h-40 py-3`} maxLength={LIMITS.parentLetterMaxChars} value={values.letter} onChange={(e) => set("letter", e.target.value)} onBlur={persist} />
          </Field>
        )}
        <Field label={t("dedication.back")} htmlFor={`${ids}-back`} help={t("editor.text.counter", { n: values.back.length, max: LIMITS.backCoverMaxChars })}>
          <textarea id={`${ids}-back`} lang={bookLanguage} className={`${inputClass} min-h-24 py-3`} maxLength={LIMITS.backCoverMaxChars} value={values.back} onChange={(e) => set("back", e.target.value)} onBlur={persist} />
        </Field>
      </div>

      <section aria-labelledby={`${ids}-check`} className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-ink/10">
        <h2 id={`${ids}-check`} className="font-heading text-2xl font-extrabold">{t("approve.title")}</h2>
        <ul className="flex flex-col gap-2 text-base">
          <SummaryRow step={1} text={summary.nameLine} extra={<span className="font-heading" lang={bookLanguage}>„{summary.sample}“</span>} />
          <SummaryRow step={4} text={summary.characters} />
          <SummaryRow step={5} text={summary.story} />
          <SummaryRow step={6} text={summary.look} />
          {summary.edited && <SummaryRow step={8} text={summary.edited} />}
          <SummaryRow text={summary.price} />
        </ul>
      </section>

      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{t("approve.title")}</legend>
        {CHECKS.map((key, i) => (
          <Check key={key} id={`${ids}-c${i}`} checked={checks[i]} onChange={(v) => setChecks(checks.map((c, j) => (j === i ? v : c)))}>
            {t(key)}
          </Check>
        ))}
        <p className="text-xs text-ink/55">{t("approve.check.note")}</p>
      </fieldset>

      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        <Button
          className="w-full sm:w-auto"
          disabled={!checks.every(Boolean)}
          pending={pending}
          onClick={() =>
            start(async () => {
              const saved = await savePersonalTextsAction(projectId!, values);
              if (!saved.ok) return setError(saved.error);
              const result = await approveBookAction(projectId!, checks);
              if (!result.ok) return setError(result.error);
              router.refresh();
            })
          }
        >
          {t("approve.cta")}
        </Button>
        <Link href={stepHref(market, projectId!, 8)} className={buttonClass("ghost")}>
          {t("approve.back_to_edit")}
        </Link>
      </StepFooter>
    </>
  );
}

function SummaryRow({ text, extra, step }: { text: string; extra?: React.ReactNode; step?: 1 | 4 | 5 | 6 | 8 }) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  return (
    <li className="flex items-start justify-between gap-3 border-b border-ink/10 pb-2 last:border-0">
      <div className="flex flex-col gap-1">
        <span>{text}</span>
        {extra}
      </div>
      {step && (
        <Link href={stepHref(market, projectId!, step)} className="shrink-0 text-sm font-medium text-brand-orange-dark underline underline-offset-4">
          {t("common.edit")}
        </Link>
      )}
    </li>
  );
}
