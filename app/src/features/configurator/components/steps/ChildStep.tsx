"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";
import { CASE_KEYS, type Gender, type NameForms } from "@/lib/language";
import { createProjectAction, lookupNameAction, updateChildAction } from "../../actions/child";
import type { NameLookup } from "../../server/names";
import { WIZARD_OCCASIONS } from "../../model";
import { stepHref } from "../../steps";
import { AGE_OPTIONS, capitalizeName, isAgeOutsideStories, validateChildName } from "../../validation";
import { StepFooter } from "../StepFooter";
import { Button, Check, Chip, Field, FieldError, Notice, StepTitle, Toggle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { pluralForm } from "@/i18n/plural";

export type ChildInitial = {
  name: string;
  gender: Gender | null;
  age: number | null;
  bookLanguage: BookLanguage;
  occasion: string | null;
  forms: NameForms | null;
  indeclinable: boolean;
};

const SAMPLES = ["child.check.sample1", "child.check.sample2", "child.check.sample3"] as const satisfies readonly MessageKey[];

export function ChildStep({ initial, bookLanguages }: { initial: ChildInitial; bookLanguages: BookLanguage[] }) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  const router = useRouter();
  const ids = useId();

  const [name, setName] = useState(initial.name);
  const [touched, setTouched] = useState(false);
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [genderTouched, setGenderTouched] = useState(initial.gender !== null);
  const [age, setAge] = useState<number | null>(initial.age);
  const [language, setLanguage] = useState<BookLanguage>(initial.bookLanguage);
  const [occasion, setOccasion] = useState<string | null>(initial.occasion);
  const [lookup, setLookup] = useState<NameLookup | null>(null);
  const [editForms, setEditForms] = useState(false);
  const [forms, setForms] = useState<NameForms | null>(initial.forms);
  const [formsEdited, setFormsEdited] = useState(false);
  const [indeclinable, setIndeclinable] = useState(initial.indeclinable);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const nameError = validateChildName(name);

  // Tvary mena zo slovníka (alebo pravidiel) počas písania – oneskorene, aby sa nevolalo pri každom písmene.
  useEffect(() => {
    if (nameError) return;
    const handle = setTimeout(async () => {
      const result = await lookupNameAction(name, language, genderTouched ? (gender ?? undefined) : undefined);
      setLookup(result);
      if (result && !genderTouched) setGender(result.gender);
      if (result && !formsEdited) {
        setForms(result.forms);
        if (!result.declinable) setIndeclinable(true);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [name, language, gender, genderTouched, nameError, formsEdited]);

  // Vzorové vety sú v jazyku knihy, nie rozhrania (CZ zákazník môže robiť SK knihu).
  const bookT = useMemo(() => createTranslator(language), [language]);
  const nameCtx = forms && gender && !nameError ? { forms, gender, declinable: !indeclinable } : null;

  const occasionLabels = splitOptions(t("child.occasion.options"));
  const ready = !nameError && !!gender && age !== null && !!forms;

  function childPayload() {
    return {
      name: capitalizeName(name),
      gender,
      age,
      bookLanguage: language,
      occasion,
      editedForms: formsEdited ? forms : null,
      indeclinable,
    };
  }

  function onContinue() {
    setTouched(true);
    if (!ready) return;
    if (!projectId) {
      dialogRef.current?.showModal();
      return;
    }
    start(async () => {
      const result = await updateChildAction(projectId, childPayload());
      if (!result.ok) return setError(result.error);
      router.push(stepHref(market, projectId, 2));
    });
  }

  return (
    <>
      <StepTitle title={t("child.title")} />

      {/* Od lg dva stĺpce: vľavo kto je dieťa, vpravo vek a kontrola mena – bez posúvania. */}
      <div className="grid gap-7 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-6">
        <div className="flex flex-col gap-6 lg:gap-5">
        <Field
          label={t("child.name.label")}
          htmlFor={`${ids}-name`}
          error={touched && nameError ? t(nameError) : undefined}
        >
          <input
            id={`${ids}-name`}
            className={inputClass}
            value={name}
            maxLength={30}
            autoComplete="off"
            autoCapitalize="words"
            placeholder={t("child.name.placeholder")}
            aria-invalid={touched && !!nameError}
            onBlur={() => setTouched(true)}
            onChange={(e) => {
              setName(e.target.value);
              setFormsEdited(false);
            }}
          />
        </Field>

        {lookup && lookup.variants.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-semibold text-ink">{t("child.name.forms.label")}</legend>
            <p className="text-sm text-ink/65">{t("child.name.forms.help")}</p>
            <div className="flex flex-wrap gap-2">
              {lookup.variants.map((variant) => (
                <Chip key={variant} shape="pill" selected={capitalizeName(name) === variant} onClick={() => setName(variant)} className="min-h-11 py-1.5 text-sm lg:min-h-10">
                  {variant}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold text-ink">{t("child.gender.label")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["girl", "boy"] as const).map((g) => (
              <Chip
                key={g}
                shape="pill"
                selected={gender === g}
                onClick={() => {
                  setGender(g);
                  setGenderTouched(true);
                  setFormsEdited(false);
                }}
                className="text-center"
              >
                {t(`child.gender.${g}`)}
              </Chip>
            ))}
          </div>
          {touched && !gender && <FieldError>{t("configurator.required")}</FieldError>}
        </fieldset>

        {bookLanguages.length > 1 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-semibold text-ink">{t("child.language.label")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {bookLanguages.map((l) => (
                <Chip key={l} shape="pill" selected={language === l} onClick={() => setLanguage(l)} className="text-center">
                  {t(`configurator.language.${l}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        </div>
        <div className="flex flex-col gap-6 lg:gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${ids}-age`} className="text-sm font-semibold text-ink">
              {t("child.age.label")}
            </label>
            <span aria-hidden className={age === null ? "text-sm text-ink/55" : "font-heading text-lg font-extrabold text-brand-orange-dark"}>
              {age === null ? t("child.age.slider_hint") : t(`configurator.age.years.${pluralForm(age)}`, { n: age })}
            </span>
          </div>
          <p id={`${ids}-age-help`} className="-mt-1 text-sm text-ink/65">
            {t("child.age.help")}
          </p>
          <AgeSlider
            id={`${ids}-age`}
            value={age}
            onChange={setAge}
            describedBy={`${ids}-age-help`}
            valueText={(n) => t(`configurator.age.years.${pluralForm(n)}`, { n })}
            placeholder={t("child.age.slider_hint")}
          />
          {age !== null && isAgeOutsideStories(age) && <Notice tone="warn">{t("child.age.outside")}</Notice>}
          {touched && age === null && <FieldError>{t("configurator.required")}</FieldError>}
        </div>

        {nameCtx && (
          <section aria-labelledby={`${ids}-check`} className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
            <h2 id={`${ids}-check`} className="font-semibold text-ink">
              {t("child.check.title")}
            </h2>
            <ul className="flex flex-col gap-2 font-heading text-lg text-ink" lang={language}>
              {SAMPLES.map((key) => (
                <li key={key}>„{bookT(key, undefined, nameCtx)}“</li>
              ))}
            </ul>
            {lookup && !lookup.known && <Notice tone="warn">{t("child.check.unknown")}</Notice>}
            {!editForms && (
              <Button variant="ghost" className="self-start px-0" onClick={() => setEditForms(true)}>
                {t("child.check.edit")}
              </Button>
            )}
            {editForms && forms && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CASE_KEYS.map((key) => (
                  <Field key={key} label={t(`configurator.case.${key}`)} htmlFor={`${ids}-case-${key}`}>
                    <input
                      id={`${ids}-case-${key}`}
                      className={inputClass}
                      value={forms[key]}
                      maxLength={24}
                      onChange={(e) => {
                        setForms({ ...forms, [key]: e.target.value });
                        setFormsEdited(true);
                      }}
                    />
                  </Field>
                ))}
              </div>
            )}
            <Toggle checked={indeclinable} onChange={setIndeclinable} label={t("child.check.indeclinable")} />
          </section>
        )}
          <Field label={t("child.occasion.label")} htmlFor={`${ids}-occasion`}>
            <select
              id={`${ids}-occasion`}
              className={inputClass}
              value={occasion ?? ""}
              onChange={(e) => setOccasion(e.target.value || null)}
            >
              <option value="">–</option>
              {WIZARD_OCCASIONS.map((o, i) => (
                <option key={o} value={o}>
                  {occasionLabels[i]}
                </option>
              ))}
            </select>
          </Field>

        </div>
        {error && <Notice tone="error">{t(error)}</Notice>}
      </div>

      <StepFooter>
        <Button onClick={onContinue} pending={pending} className="w-full sm:w-auto">
          {t("common.continue")}
        </Button>
      </StepFooter>

      <EmailDialog
        dialogRef={dialogRef}
        onSubmit={async (email, marketing) => {
          const result = await createProjectAction({ market, child: childPayload(), email, marketingConsent: marketing });
          if (!result.ok) return result.error;
          router.push(result.data.href);
          return null;
        }}
      />
    </>
  );
}

function EmailDialog({
  dialogRef,
  onSubmit,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onSubmit: (email: string, marketing: boolean) => Promise<MessageKey | null>;
}) {
  const { t } = useI18n();
  const ids = useId();
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${ids}-title`}
      className="m-auto w-[min(100vw-2rem,28rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setError(await onSubmit(email.trim(), marketing)));
        }}
      >
        <h2 id={`${ids}-title`} className="font-heading text-2xl font-extrabold">
          {t("common.email_dialog.title")}
        </h2>
        <p className="text-sm text-ink/70">{t("common.email_dialog.help")}</p>
        <Field label={t("common.email_dialog.field")} htmlFor={`${ids}-email`} error={error ? t(error) : undefined}>
          <input
            id={`${ids}-email`}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Check id={`${ids}-marketing`} checked={marketing} onChange={setMarketing}>
          {t("common.email_dialog.marketing")}
        </Check>
        <div className="flex flex-col gap-2">
          <Button type="submit" pending={pending}>
            {t("common.email_dialog.cta")}
          </Button>
          <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * Vek posuvníkom (2 – 10). Kým sa zákazník posuvníka nedotkne, vek nie je
 * vybraný (sivý bežec, bez výplne); ťuknutie na číslo pod ním vek nastaví tiež.
 */
function AgeSlider({
  id,
  value,
  onChange,
  describedBy,
  valueText,
  placeholder,
}: {
  id: string;
  value: number | null;
  onChange: (age: number) => void;
  describedBy: string;
  valueText: (n: number) => string;
  placeholder: string;
}) {
  const min = AGE_OPTIONS[0];
  const max = AGE_OPTIONS[AGE_OPTIONS.length - 1];
  const current = value ?? Math.round((min + max) / 2);
  const ratio = (n: number) => (n - min) / (max - min);
  // Stred bežca (1.75rem) – výplň aj čísla sa zarovnávajú naň.
  const at = (r: number) => `calc(0.875rem + (100% - 1.75rem) * ${r})`;

  return (
    <div className="flex flex-col">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        data-unset={value === null || undefined}
        aria-describedby={describedBy}
        aria-valuetext={value === null ? placeholder : valueText(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        // Klik alebo kláves bez posunu (bežec už stojí na hodnote) vek tiež vyberie.
        onPointerUp={(e) => value === null && onChange(Number(e.currentTarget.value))}
        onKeyUp={(e) => value === null && onChange(Number(e.currentTarget.value))}
        className="range"
        style={{ "--fill": value === null ? "0%" : at(ratio(value)) } as React.CSSProperties}
      />
      <div aria-hidden className="relative h-6">
        {AGE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(n)}
            style={{ left: at(ratio(n)) }}
            className={
              "absolute top-0 -translate-x-1/2 px-1.5 text-sm tabular-nums transition-colors " +
              (value === n ? "font-semibold text-ink" : "text-ink/50 hover:text-ink")
            }
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
