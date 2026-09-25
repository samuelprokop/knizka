"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from "@/components/icons";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { approveTextAction, editSpreadAction, rewriteSpreadAction } from "../../actions/story";
import { stepHref } from "../../steps";
import { StepFooter } from "../StepFooter";
import { Button, Chip, cx, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { useSubStep } from "../WizardMotion";
import { StoryOptions, type StoryStepProps } from "./StoryStep";

export type SpreadView = { text: string; aiFilled: boolean };

/** Max. znakov na dvojstranu pri vlastnej úprave (zhodné so serverom). */
const SPREAD_MAX = 400;

/** Cesty C a D: text na čítanie a schválenie pred ilustráciami (K5.8, C3 – C4). */
/** Koľko dvojstrán ukáže prehľad naraz (3 × 2 od desktopu) – celý text by sa nezmestil na obrazovku. */
const PER_PAGE = 6;

/** Cesty C a D: text na čítanie a schválenie pred ilustráciami (K5.8, C3 – C4). */
export function StoryTextReview(props: StoryStepProps) {
  const { t } = useI18n();
  const { market, projectId, bookLanguage } = useWizard();
  const router = useRouter();
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const [page, setPage] = useState(0);
  // Úprava jednej dvojstrany je podstránka (v lište ako ďalší krok, Späť vráti na prehľad).
  const [editing, setEditing] = useState<number | null>(null);
  const title = props.storyInput.generated?.title;
  useSubStep(editing !== null ? t("text.spread", { n: editing + 1 }) : null, () => setEditing(null));

  if (!props.spreads.length) return <Notice tone="error">{t("story.refuse.retry")}</Notice>;

  if (editing !== null && props.spreads[editing]) {
    return (
      <>
        <StepTitle title={t("text.spread", { n: editing + 1 })} />
        <ol className="flex flex-col">
          <SpreadEditor key={editing} index={editing} spread={props.spreads[editing]} rewritesLeft={props.rewritesLeft} rewriteCharacter={props.rewriteCharacter} />
        </ol>
        <StepFooter>
          <Button variant="next" className="w-full sm:w-auto" onClick={() => setEditing(null)}>
            {t("common.done")}
          </Button>
        </StepFooter>
      </>
    );
  }

  const pages = Math.ceil(props.spreads.length / PER_PAGE);
  const from = page * PER_PAGE;
  const visible = props.spreads.slice(from, from + PER_PAGE);

  return (
    <>
      <StepTitle title={t("text.title")} subtitle={t("text.subtitle")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title && <p className="font-heading text-2xl font-extrabold">{props.options.bookTitle || title}</p>}
        {pages > 1 && (
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label={t("text.pager.prev")} className="flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 outline-none hover:ring-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40 disabled:opacity-40">
              <ChevronLeftIcon className="size-5" />
            </button>
            <span aria-live="polite" className="min-w-28 text-center tabular-nums">
              {t("text.pager", { from: from + 1, to: from + visible.length, total: props.spreads.length })}
            </span>
            <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label={t("text.pager.next")} className="flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 outline-none hover:ring-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40 disabled:opacity-40">
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        )}
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((spread, i) => (
          <li key={from + i}>
            <button
              type="button"
              onClick={() => setEditing(from + i)}
              aria-label={`${t("text.spread", { n: from + i + 1 })}: ${t("text.edit")}`}
              className={cx(
                "group flex h-full w-full flex-col gap-2 rounded-2xl bg-white p-4 text-left ring-1 outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand-orange/40 motion-reduce:hover:translate-y-0",
                spread.aiFilled ? "ring-brand-teal/60" : "ring-ink/10"
              )}
            >
              <span className="flex items-center justify-between text-xs font-semibold text-ink/60">
                {t("text.spread", { n: from + i + 1 })}
                <span className="flex items-center gap-1 text-brand-orange-dark opacity-70 transition-opacity group-hover:opacity-100">
                  <PencilIcon className="size-3.5" />
                  {t("common.edit")}
                </span>
              </span>
              <span lang={bookLanguage} className="line-clamp-5 font-heading text-[0.9375rem] leading-relaxed text-ink">{spread.text}</span>
              {spread.aiFilled && <span className="mt-auto text-xs font-medium text-brand-teal">{t("text.ai_filled")}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <StoryOptions options={props.options} prices={props.prices} />
        <Notice>{t("text.approve.note")}</Notice>
      </div>
      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        <Button
          variant="next"
          className="w-full sm:w-auto"
          pending={pending}
          onClick={() =>
            start(async () => {
              const result = await approveTextAction(projectId!);
              if (!result.ok) return setError(result.error);
              router.push(stepHref(market, projectId!, 6));
            })
          }
        >
          {t("text.approve")}
        </Button>
      </StepFooter>
    </>
  );
}

function SpreadEditor({ index, spread, rewritesLeft, rewriteCharacter }: { index: number; spread: SpreadView; rewritesLeft: number; rewriteCharacter: string | null }) {
  const { t } = useI18n();
  const { projectId, bookLanguage } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [mode, setMode] = useState<"read" | "edit" | "rewrite">("read");
  const [text, setText] = useState(spread.text);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  // „viac o {character}“ má zmysel len s ďalšou postavou.
  const options = splitOptions(t("text.rewrite.options", { character: rewriteCharacter ?? "" })).filter(
    (_, i) => i !== 3 || !!rewriteCharacter
  );

  const run = (action: () => Promise<{ ok: boolean; error?: MessageKey }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error ?? "error.generic");
      setError(null);
      setMode("read");
      router.refresh();
    });

  return (
    <li className={cx("flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1", spread.aiFilled ? "ring-brand-teal/60" : "ring-ink/10")}>
      <h2 className="text-sm font-semibold text-ink/65">{t("text.spread", { n: index + 1 })}</h2>
      {spread.aiFilled && <p className="text-sm font-medium text-brand-teal">{t("text.ai_filled")}</p>}

      {mode === "edit" ? (
        <Field label={t("text.edit")} htmlFor={`${ids}-text`} help={t("editor.text.counter", { n: text.length, max: SPREAD_MAX })}>
          <textarea id={`${ids}-text`} lang={bookLanguage} className={`${inputClass} min-h-32 py-3 leading-relaxed`} maxLength={SPREAD_MAX} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      ) : (
        <p lang={bookLanguage} className="font-heading text-lg leading-relaxed">{spread.text}</p>
      )}

      {mode === "rewrite" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Chip key={o} selected={instruction === o} onClick={() => setInstruction(o)}>{o}</Chip>
            ))}
          </div>
          <input className={inputClass} maxLength={200} value={instruction} onChange={(e) => setInstruction(e.target.value)} aria-label={t("editor.image.custom")} />
          <p className="text-sm text-ink/65">{t("text.rewrite.counter", { n: rewritesLeft })}</p>
        </div>
      )}
      {error && <Notice tone="error">{t(error)}</Notice>}

      <div className="flex flex-wrap gap-2">
        {mode === "read" ? (
          <>
            <Button variant="secondary" onClick={() => { setText(spread.text); setMode("edit"); }}>{t("text.edit")}</Button>
            <Button variant="secondary" disabled={rewritesLeft <= 0} onClick={() => setMode("rewrite")}>{t("text.rewrite")}</Button>
          </>
        ) : (
          <>
            <Button
              pending={pending}
              disabled={mode === "rewrite" ? !instruction.trim() : !text.trim()}
              onClick={() => run(() => (mode === "edit" ? editSpreadAction(projectId!, index, text) : rewriteSpreadAction(projectId!, index, instruction)))}
            >
              {mode === "edit" ? t("common.done") : t("text.rewrite")}
            </Button>
            <Button variant="ghost" onClick={() => setMode("read")}>{t("common.cancel")}</Button>
          </>
        )}
      </div>
    </li>
  );
}
