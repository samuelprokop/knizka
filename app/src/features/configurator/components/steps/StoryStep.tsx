"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";

import type { ReadingLevel } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";
import { chooseStoryAction, saveStoryOptionsAction } from "../../actions/story";
import { DETAIL_MAX_CHARS, type DetailSlot, type StoryInput } from "../../model";
import { stepHref } from "../../steps";
import { StepFooter } from "../StepFooter";
import { Button, buttonClass, Chip, cx, Disclosure, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { StoryCustom } from "./StoryCustom";
import { StoryTextReview, type SpreadView } from "./StoryTextReview";

export type StoryTile = {
  id: string;
  title: string;
  annotation: string;
  ageMin: number;
  ageMax: number;
  category: string;
  spreads: number;
  styles: string[];
  companionSlots: number;
  needsGuide: boolean;
  goal: string | null;
  author: string | null;
  samples: string[];
  detailSlots: DetailSlot[];
};

export type StoryView = "library" | "detail" | "details" | "custom" | "questions" | "ideas" | "own" | "text";

export type StoryStepProps = {
  view: StoryView;
  tiles: StoryTile[];
  selectedId: string | null;
  chosenId: string | null;
  path: string | null;
  storyChosen: boolean;
  heroAge: number;
  heroPortrait: string | null;
  themeColor: string;
  companions: number;
  guideNone: boolean;
  storyInput: StoryInput;
  spreads: SpreadView[];
  rewritesLeft: number;
  ideaRoundsLeft: number;
  characterNames: string[];
  /** Meno postavy v lokáli pre pokyn „viac o …“. */
  rewriteCharacter: string | null;
  options: { readingLevel: ReadingLevel; spreadCount: 12 | 16; bookTitle: string };
  prices: { customStory: string; pages40: string };
  customLimitReached: boolean;
};

const CATEGORIES = ["milestones", "holidays", "adventure", "emotions", "learning"] as const;

export function StoryStep(props: StoryStepProps) {
  switch (props.view) {
    case "detail":
    case "details":
      return <StoryDetail {...props} />;
    case "custom":
    case "questions":
    case "ideas":
    case "own":
      return <StoryCustom {...props} />;
    case "text":
      return <StoryTextReview {...props} />;
    default:
      return <StoryLibrary {...props} />;
  }
}

export function useStoryNav() {
  const { market, projectId } = useWizard();
  const base = stepHref(market, projectId!, 5);
  return (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return query ? `${base}?${query}` : base;
  };
}

function StoryLibrary({ tiles, heroAge, heroPortrait, themeColor, companions, guideNone, chosenId, storyChosen, path }: StoryStepProps) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const nav = useStoryNav();
  const [age, setAge] = useState<number | null>(heroAge);
  const [category, setCategory] = useState<string | null>(null);
  const [multi, setMulti] = useState(false);
  const heroCtx = hero ?? undefined;

  const visible = tiles.filter(
    (tile) =>
      (age === null || (age >= tile.ageMin && age <= tile.ageMax)) &&
      (!category || tile.category === category) &&
      (!multi || tile.companionSlots > 0)
  );

  return (
    <>
      <StepTitle title={t("story.title", undefined, heroCtx)} />
      {storyChosen && (path === "C" || path === "D") && (
        <Notice tone="ok">
          <Link href={nav({ v: "text" })} className="font-semibold underline underline-offset-4">
            {t("configurator.story.continue_custom")}
          </Link>
        </Notice>
      )}

      <Disclosure summary={t("configurator.story.filters")}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("story.filter.age")}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={age === null} onClick={() => setAge(null)}>{t("configurator.story.all")}</Chip>
            {[3, 4, 5, 6, 7, 8].map((a) => (
              <Chip key={a} selected={age === a} onClick={() => setAge(a)} aria-label={t("configurator.age.years", { n: a })}>
                {a}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("story.filter.theme")}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={category === null} onClick={() => setCategory(null)}>{t("configurator.story.all")}</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                {t(`story.category.${c}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Chip selected={multi} onClick={() => setMulti(!multi)}>{t("story.filter.multi")}</Chip>
      </Disclosure>

      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((tile) => (
          <li key={tile.id}>
            <Link
              href={nav({ pribeh: tile.id })}
              className={cx(
                "flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 outline-none transition hover:shadow-lg focus-visible:ring-4 focus-visible:ring-brand-orange/40",
                chosenId === tile.id ? "ring-4 ring-brand-orange" : "ring-ink/10"
              )}
            >
              <StoryCover title={tile.title} portrait={heroPortrait} color={themeColor} />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm text-ink/65">
                  {t("configurator.story.age_range", { from: tile.ageMin, to: tile.ageMax })} · {t("story.card.pages", { n: tile.spreads })}
                </p>
                <p className="text-sm text-ink/80">{tile.annotation}</p>
                <ul className="mt-auto flex flex-wrap gap-1 pt-2 text-xs">
                  <Tag>{t("story.card.styles", { styles: tile.styles.map((s) => t(`style.${s}` as MessageKey)).join(", ") })}</Tag>
                  {tile.companionSlots > 0 ? <Tag>{t("story.card.companion_slots", { n: tile.companionSlots })}</Tag> : companions > 0 && <Tag warn>{t("configurator.story.no_slot")}</Tag>}
                  {tile.needsGuide && <Tag warn={guideNone}>{t("story.card.needs_guide")}</Tag>}
                </ul>
              </div>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={nav({ v: "vlastny" })}
            className="flex h-full min-h-48 flex-col justify-center gap-2 rounded-3xl border-2 border-dashed border-brand-orange/60 bg-brand-orange/5 p-6 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <span className="font-heading text-xl font-extrabold text-ink">{t("story.not_found.title")}</span>
            <span className="text-sm text-ink/75">{t("story.not_found.body")}</span>
          </Link>
        </li>
      </ul>

      <StepFooter>
        {storyChosen && (
          <Link href={stepHref(market, projectId!, 6)} className={buttonClass("primary", "w-full sm:w-auto")}>
            {t("common.continue")}
          </Link>
        )}
      </StepFooter>
    </>
  );
}

function Tag({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return <li className={cx("rounded-full px-2 py-1", warn ? "bg-[#fff1d6] text-ink" : "bg-paper text-ink/75")}>{children}</li>;
}

/** Obálka v knižnici: hrdina (Karta) a názov s menom – kým nie sú vygenerované obálky príbehov. */
export function StoryCover({ title, portrait, color }: { title: string; portrait: string | null; color: string }) {
  return (
    <div className="relative flex aspect-[4/3] items-end overflow-hidden p-4" style={{ backgroundColor: color }}>
      {portrait && (
        // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
        <img src={portrait} alt="" className="absolute top-3 right-3 aspect-square h-3/4 rounded-full object-cover ring-4 ring-white/70" />
      )}
      <span className="relative max-w-[70%] font-heading text-2xl leading-tight font-extrabold text-white drop-shadow">{title}</span>
    </div>
  );
}

function StoryDetail(props: StoryStepProps) {
  const { t } = useI18n();
  const { market, projectId, hero, bookLanguage } = useWizard();
  const router = useRouter();
  const nav = useStoryNav();
  const ids = useId();
  const tile = props.tiles.find((x) => x.id === props.selectedId);
  const [details, setDetails] = useState<Partial<Record<DetailSlot, string>>>(
    props.chosenId === props.selectedId ? (props.storyInput.details ?? {}) : {}
  );
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const bookT = useMemo(() => createTranslator(bookLanguage as BookLanguage), [bookLanguage]);
  const heroCtx = hero ?? undefined;

  if (!tile) return <Notice tone="error">{t("story.refuse.retry")}</Notice>;
  const withDetails = props.view === "details";
  const minutes = Math.max(3, Math.round(tile.spreads * 0.5));

  const choose = () =>
    start(async () => {
      const result = await chooseStoryAction(projectId!, tile.id, withDetails ? details : {});
      if (!result.ok) return setError(result.error);
      router.push(stepHref(market, projectId!, 6));
    });

  return (
    <>
      <Link href={nav()} className={buttonClass("ghost", "self-start px-0")}>
        ← {t("common.back")}
      </Link>
      <div className="overflow-hidden rounded-3xl">
        <StoryCover title={tile.title} portrait={props.heroPortrait} color={props.themeColor} />
      </div>

      {!withDetails ? (
        <>
          <p className="text-base leading-relaxed text-ink/85">{tile.annotation}</p>
          {tile.goal && <p className="text-sm text-ink/75">{t("story.card.goal", { goal: tile.goal })}</p>}
          <p className="text-sm text-ink/65">
            {tile.author && `${t("story.detail.author", { author: tile.author })} · `}
            {t("story.detail.reading_time", { minutes })} · {t("story.card.pages", { n: tile.spreads })}
          </p>
          {props.companions > tile.companionSlots && <Notice tone="warn">{t("configurator.story.no_slot")}</Notice>}
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t("configurator.story.sample")}</h2>
            {tile.samples.map((text, i) => (
              <blockquote key={i} lang={bookLanguage} className="rounded-3xl bg-paper-page p-5 font-heading text-lg leading-relaxed text-ink ring-1 ring-ink/10">
                {text}
              </blockquote>
            ))}
          </section>
        </>
      ) : (
        <section className="flex flex-col gap-4">
          <StepTitle title={t("details.title", undefined, heroCtx)} subtitle={t("details.help")} />
          {tile.detailSlots.map((slot) => (
            <Field
              key={slot}
              label={t(`details.${slot}`)}
              htmlFor={`${ids}-${slot}`}
              help={
                details[slot]
                  ? t("details.preview", { sentence: bookT(`configurator.details.sample.${slot}`, { value: details[slot]! }, heroCtx) })
                  : t(slot === "toy" || slot === "friend" ? "details.in_picture" : "details.text_only")
              }
            >
              <input
                id={`${ids}-${slot}`}
                className={inputClass}
                maxLength={DETAIL_MAX_CHARS}
                value={details[slot] ?? ""}
                onChange={(e) => setDetails({ ...details, [slot]: e.target.value })}
              />
            </Field>
          ))}
        </section>
      )}

      {error && <Notice tone="error">{t(error)}</Notice>}
      <StoryOptions {...props} fixedLength={tile.spreads as 12 | 16} />

      <StepFooter>
        <Button className="w-full sm:w-auto" pending={pending} onClick={choose}>
          {withDetails ? t("common.continue") : t("story.select")}
        </Button>
        {!withDetails && tile.detailSlots.length > 0 && (
          <Link href={nav({ pribeh: tile.id, v: "detaily" })} className={buttonClass("secondary", "w-full sm:w-auto")}>
            {t("story.details")}
          </Link>
        )}
      </StepFooter>
    </>
  );
}

/** Voľby k príbehu: čitateľská úroveň (len C/D, pri hotových fáza 2), dĺžka, vlastný názov (K5.11). */
export function StoryOptions({
  options,
  prices,
  fixedLength,
  showLength,
}: Pick<StoryStepProps, "options" | "prices"> & { fixedLength?: 12 | 16; showLength?: boolean }) {
  const { t } = useI18n();
  const { projectId } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [level, setLevel] = useState(options.readingLevel);
  const [length, setLength] = useState(options.spreadCount);
  const [title, setTitle] = useState(options.bookTitle);
  const [, start] = useTransition();
  const lengthLabels = splitOptions(t("story.options.length.options", { price: prices.pages40 }));
  const custom = !fixedLength;

  const save = (patch: Record<string, unknown>) =>
    start(async () => {
      await saveStoryOptionsAction(projectId!, patch);
      router.refresh();
    });

  return (
    <Disclosure summary={t("common.more_options")}>
      {custom && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("story.options.level")}</legend>
          {(["A", "B", "C"] as const).map((l) => (
            <Chip key={l} selected={level === l} onClick={() => { setLevel(l); save({ readingLevel: l }); }}>
              {t(`story.options.level.${l.toLowerCase() as "a" | "b" | "c"}`)}
            </Chip>
          ))}
        </fieldset>
      )}
      {custom && showLength && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("story.options.length")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {([12, 16] as const).map((n, i) => (
              <Chip key={n} selected={length === n} onClick={() => { setLength(n); save({ spreadCount: n }); }}>
                {lengthLabels[i]}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      <Field label={t("story.options.title")} htmlFor={`${ids}-title`} help={t("configurator.story.title_help")}>
        <input
          id={`${ids}-title`}
          className={inputClass}
          maxLength={60}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== options.bookTitle && save({ bookTitle: title })}
        />
      </Field>
    </Disclosure>
  );
}

