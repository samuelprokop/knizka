"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { approveTextAction, editSpreadAction, rewriteSpreadAction } from "../../actions/story";
import { stepHref } from "../../steps";
import { StepFooter } from "../StepFooter";
import { Button, Chip, cx, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { StoryOptions, type StoryStepProps } from "./StoryStep";

export type SpreadView = { text: string; aiFilled: boolean };

/** Max. znakov na dvojstranu pri vlastnej úprave (zhodné so serverom). */
const SPREAD_MAX = 400;

/** Cesty C a D: text na čítanie a schválenie pred ilustráciami (K5.8, C3 – C4). */
export function StoryTextReview(props: StoryStepProps) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  const router = useRouter();
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const title = props.storyInput.generated?.title;

  if (!props.spreads.length) return <Notice tone="error">{t("story.refuse.retry")}</Notice>;

  return (
    <>
      <StepTitle title={t("text.title")} subtitle={t("text.subtitle")} />
      {title && <p className="font-heading text-2xl font-extrabold">{props.options.bookTitle || title}</p>}
      <ol className="flex flex-col gap-4">
        {props.spreads.map((spread, i) => (
          <SpreadEditor key={i} index={i} spread={spread} rewritesLeft={props.rewritesLeft} rewriteCharacter={props.rewriteCharacter} />
        ))}
      </ol>
      <StoryOptions options={props.options} prices={props.prices} />
      <Notice>{t("text.approve.note")}</Notice>
      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        <Button
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
