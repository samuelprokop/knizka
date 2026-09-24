"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { LIMITS } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { renderNameTokens } from "@/lib/language";
import { pickIdeaAction, requestIdeasAction, writeOwnStoryAction } from "../../actions/story";
import { WIZARD_MESSAGES, WIZARD_OCCASIONS, WIZARD_TONES, WIZARD_WORLDS, type WizardAnswers } from "../../model";
import { StepFooter } from "../StepFooter";
import { Button, buttonClass, Chip, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { StoryOptions, useStoryNav, type StoryStepProps } from "./StoryStep";
import { ChevronLeftIcon } from "@/components/icons";

export function StoryCustom(props: StoryStepProps) {
  switch (props.view) {
    case "questions":
      return <Questions {...props} />;
    case "ideas":
      return <Ideas {...props} />;
    case "own":
      return <OwnStory {...props} />;
    default:
      return <Chooser {...props} />;
  }
}

function Chooser(props: StoryStepProps) {
  const { t } = useI18n();
  const nav = useStoryNav();
  return (
    <>
      <Link href={nav()} className={buttonClass("ghost", "self-start px-0")}>
        <ChevronLeftIcon className="size-4" />
        {t("common.back")}
      </Link>
      <StepTitle title={t("story.not_found.title")} subtitle={t("story.custom.surcharge", { price: props.prices.customStory })} />
      {props.customLimitReached ? (
        <Notice tone="warn">{t("story.limit.custom")}</Notice>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={nav({ v: "otazky" })} className={buttonClass("primary")}>
            {t("story.custom.help_me")}
          </Link>
          <Link href={nav({ v: "napisat" })} className={buttonClass("secondary")}>
            {t("story.custom.write")}
          </Link>
        </div>
      )}
      <StoryOptions options={props.options} prices={props.prices} showLength />
      <StepFooter back={false} />
    </>
  );
}

type Question = "occasion" | "world" | "message" | "favorites" | "companions" | "tone" | "wish";

function Questions(props: StoryStepProps) {
  const { t } = useI18n();
  const { projectId, hero } = useWizard();
  const router = useRouter();
  const nav = useStoryNav();
  const ids = useId();
  const heroCtx = hero ?? undefined;
  const [answers, setAnswers] = useState<WizardAnswers>(props.storyInput.wizard?.answers ?? {});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  const companionNames = props.characterNames;
  const questions: Question[] = ["occasion", "world", "message", "favorites", ...(companionNames.length ? (["companions"] as const) : []), "tone", "wish"];
  const q = questions[index];
  const last = index === questions.length - 1;

  const toggleWorld = (w: (typeof WIZARD_WORLDS)[number]) => {
    const worlds = answers.worlds ?? [];
    if (worlds.includes(w)) setAnswers({ ...answers, worlds: worlds.filter((x) => x !== w) });
    else if (worlds.length < 2) setAnswers({ ...answers, worlds: [...worlds, w] });
  };

  function next() {
    if (!last) return setIndex(index + 1);
    start(async () => {
      const result = await requestIdeasAction(projectId!, answers);
      if (!result.ok) return setError(result.error);
      router.push(nav({ v: "namety" }));
    });
  }

  const labels = (key: MessageKey) => splitOptions(t(key));

  return (
    <>
      <p className="text-sm font-medium text-ink/70">{t("configurator.wizard.question", { n: index + 1, total: questions.length })}</p>
      {q === "occasion" && (
        <Tiles title={t("wizard.q.occasion", undefined, heroCtx)} ids={WIZARD_OCCASIONS} labels={labels("child.occasion.options")} selected={(id) => answers.occasion === id} onPick={(id) => setAnswers({ ...answers, occasion: id })} />
      )}
      {q === "world" && (
        <Tiles title={t("wizard.q.world")} ids={WIZARD_WORLDS} labels={labels("wizard.q.world.options")} selected={(id) => !!answers.worlds?.includes(id)} onPick={toggleWorld} />
      )}
      {q === "message" && (
        <Tiles title={t("wizard.q.message", undefined, heroCtx)} ids={WIZARD_MESSAGES} labels={labels("wizard.q.message.options")} selected={(id) => answers.message === id} onPick={(id) => setAnswers({ ...answers, message: answers.message === id ? undefined : id })} />
      )}
      {q === "favorites" && (
        <Field label={<span className="font-heading text-2xl font-extrabold">{t("wizard.q.favorites", undefined, heroCtx)}</span>} htmlFor={`${ids}-fav`}>
          <input id={`${ids}-fav`} className={inputClass} maxLength={200} value={answers.favorites ?? ""} onChange={(e) => setAnswers({ ...answers, favorites: e.target.value })} />
        </Field>
      )}
      {q === "companions" && (
        <Tiles
          title={t("wizard.q.companions", undefined, heroCtx)}
          ids={companionNames}
          labels={companionNames}
          selected={(id) => !!answers.companions?.includes(id)}
          onPick={(id) => {
            const list = answers.companions ?? [];
            setAnswers({ ...answers, companions: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
          }}
        />
      )}
      {q === "tone" && (
        <Tiles title={t("wizard.q.tone")} ids={WIZARD_TONES} labels={labels("wizard.q.tone.options")} selected={(id) => answers.tone === id} onPick={(id) => setAnswers({ ...answers, tone: id })} />
      )}
      {q === "wish" && (
        <Field label={<span className="font-heading text-2xl font-extrabold">{t("wizard.q.wish")}</span>} htmlFor={`${ids}-wish`} help={`${(answers.wish ?? "").length} / ${LIMITS.wishMaxChars}`}>
          <textarea
            id={`${ids}-wish`}
            className={`${inputClass} min-h-32 py-3`}
            maxLength={LIMITS.wishMaxChars}
            placeholder={t("wizard.q.wish.placeholder")}
            value={answers.wish ?? ""}
            onChange={(e) => setAnswers({ ...answers, wish: e.target.value })}
          />
        </Field>
      )}

      {pending && <Notice>{t("wizard.ideas.generating")}</Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter back={false}>
        <Button className="w-full sm:w-auto" pending={pending} disabled={(q === "occasion" && !answers.occasion) || (q === "world" && !answers.worlds?.length) || (q === "tone" && !answers.tone)} onClick={next}>
          {t("common.continue")}
        </Button>
        {index > 0 ? (
          <Button variant="ghost" onClick={() => setIndex(index - 1)}>{t("common.back")}</Button>
        ) : (
          <Link href={nav({ v: "vlastny" })} className={buttonClass("ghost")}>{t("common.back")}</Link>
        )}
      </StepFooter>
    </>
  );
}

function Tiles<T extends string>({ title, ids, labels, selected, onPick }: { title: string; ids: readonly T[]; labels: string[]; selected: (id: T) => boolean; onPick: (id: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-heading text-2xl leading-tight font-extrabold text-ink">{title}</legend>
      <div className="grid grid-cols-2 gap-3">
        {ids.map((id, i) => (
          <Chip key={id} selected={selected(id)} onClick={() => onPick(id)} className="min-h-16 text-center">
            {labels[i]}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function Ideas(props: StoryStepProps) {
  const { t } = useI18n();
  const { projectId, hero } = useWizard();
  const router = useRouter();
  const nav = useStoryNav();
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState<number | null>(null);
  const ideas = props.storyInput.wizard?.ideas ?? [];
  const heroCtx = hero ?? undefined;
  const render = (text: string) => (hero ? renderNameTokens(text, hero) : text);

  return (
    <>
      <StepTitle title={t("wizard.ideas.title", undefined, heroCtx)} />
      <ul className="flex flex-col gap-3">
        {ideas.map((idea, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-ink/10">
            <h2 className="font-heading text-xl font-extrabold">{render(idea.title)}</h2>
            <p className="text-ink/80">{render(idea.summary)}</p>
            <Button
              variant="secondary"
              pending={pending && picking === i}
              disabled={pending}
              onClick={() => {
                setPicking(i);
                start(async () => {
                  const result = await pickIdeaAction(projectId!, i);
                  if (!result.ok) return setError(result.error);
                  router.push(nav({ v: "text" }));
                });
              }}
            >
              {t("wizard.ideas.pick")}
            </Button>
          </li>
        ))}
      </ul>
      {pending && picking !== null && <Notice>{t("text.generating")}</Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          disabled={props.ideaRoundsLeft <= 0 || pending}
          pending={pending && picking === null}
          onClick={() =>
            start(async () => {
              setPicking(null);
              const result = await requestIdeasAction(projectId!, props.storyInput.wizard?.answers ?? {});
              if (!result.ok) return setError(result.error);
              router.refresh();
            })
          }
        >
          {t("wizard.ideas.more")} · {t("wizard.ideas.more.counter", { n: props.ideaRoundsLeft })}
        </Button>
        <Link href={nav({ v: "otazky" })} className={buttonClass("ghost")}>
          {t("wizard.ideas.change_answers")}
        </Link>
      </div>
      <StepFooter />
    </>
  );
}

function OwnStory(props: StoryStepProps) {
  const { t } = useI18n();
  const { projectId, hero } = useWizard();
  const router = useRouter();
  const nav = useStoryNav();
  const ids = useId();
  const [text, setText] = useState(props.storyInput.own?.text ?? "");
  const [mode, setMode] = useState<"strict" | "free">(props.storyInput.own?.mode ?? "free");
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <Link href={nav({ v: "vlastny" })} className={buttonClass("ghost", "self-start px-0")}>
        <ChevronLeftIcon className="size-4" />
        {t("common.back")}
      </Link>
      <StepTitle title={t("own.title", undefined, hero ?? undefined)} />
      <Field label={t("configurator.own.label")} htmlFor={`${ids}-own`} help={t("own.counter", { n: text.length })}>
        <textarea
          id={`${ids}-own`}
          className={`${inputClass} min-h-56 py-3 leading-relaxed`}
          maxLength={LIMITS.ownStoryMaxChars}
          placeholder={t("own.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Chip selected={mode === "strict"} onClick={() => setMode("strict")}>{t("own.mode.strict")}</Chip>
        <Chip selected={mode === "free"} onClick={() => setMode("free")}>{t("own.mode.free")}</Chip>
      </div>
      {pending && <Notice>{t("text.generating")}</Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter back={false}>
        <Button
          className="w-full sm:w-auto"
          pending={pending}
          disabled={text.trim().length < 20}
          onClick={() =>
            start(async () => {
              const result = await writeOwnStoryAction(projectId!, text, mode);
              if (!result.ok) return setError(result.error);
              router.push(nav({ v: "text" }));
            })
          }
        >
          {t("common.continue")}
        </Button>
      </StepFooter>
    </>
  );
}
