"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ACTIVITIES, ACTIVITY_PICK_COUNT, BOOK_FORMATS, COVER_DESIGNS, LAYOUTS, type ActivityId, type LayoutId } from "@/config/catalog";
import { SampleSpread, type SampleSpreadData } from "@/features/book/components/SampleSpread";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { generateBookAction, saveLookAction } from "../../actions/book";
import { ENDPAPERS, FONT_PAIRS, THEME_SPECS, THEMES, TITLE_POSITIONS, type LookOptions } from "../../model";
import { stepHref } from "../../steps";
import { StepFooter } from "../StepFooter";
import { Button, Chip, cx, Disclosure, Notice, StepTitle, Toggle, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";

const LAYOUT_KEYS: Record<LayoutId, { name: MessageKey; help: MessageKey }> = {
  classic: { name: "layout.classic", help: "layout.classic.help" },
  panoramic: { name: "layout.panorama", help: "layout.panorama.help" },
  picture: { name: "layout.picture", help: "layout.picture.help" },
  first_reading: { name: "layout.first_reading", help: "layout.first_reading.help" },
};

export type LookStepProps = {
  look: LookOptions;
  layout: LayoutId;
  format: "A4" | "A5";
  pageCount: 32 | 40;
  forced40: boolean;
  /** Dáta ukážkovej dvojstrany z renderera (text prvej dvojstrany s menom, ilustrácie). */
  sample: SampleSpreadData | null;
  canGenerate: boolean;
  bookExists: boolean;
  prices: { coloring: string; pages40: string };
};

export function LookStep(props: LookStepProps) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const router = useRouter();
  const [look, setLook] = useState(props.look);
  const [layout, setLayout] = useState(props.layout);
  const [format, setFormat] = useState(props.format);
  const [pageCount, setPageCount] = useState(props.pageCount);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [saving, startSave] = useTransition();
  const [generating, startGenerate] = useTransition();
  const heroCtx = hero ?? undefined;

  // Každá voľba sa uloží hneď – ukážka sa prekreslí a cena v lište prepočíta.
  function save(patch: Partial<LookOptions> & { layout?: LayoutId; format?: "A4" | "A5"; pageCount?: 32 | 40 }) {
    startSave(async () => {
      const result = await saveLookAction(projectId!, patch);
      if (!result.ok) return setError(result.error);
      setError(null);
      if (result.data.regenerate) router.push(stepHref(market, projectId!, 7));
      else router.refresh();
    });
  }
  const setOption = <K extends keyof LookOptions>(key: K, value: LookOptions[K]) => {
    setLook({ ...look, [key]: value });
    save({ [key]: value });
  };

  function toggleActivity(id: ActivityId) {
    const has = look.activities.includes(id);
    if (!has && look.activities.length >= ACTIVITY_PICK_COUNT) return;
    setOption("activities", has ? look.activities.filter((a) => a !== id) : [...look.activities, id]);
  }

  const pageLabels = splitOptions(t("book.pages.options", { price: props.prices.pages40 }));

  return (
    <>
      <StepTitle title={t("layout.title")} subtitle={t("layout.subtitle")} />

      {props.sample && (
        <SampleSpread
          data={props.sample}
          layout={layout}
          format={format}
          theme={look.theme}
          fontPair={look.fontPair}
          frames={look.frames}
          className="rounded-2xl shadow-md"
        />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("layout.title")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => (
            <Chip
              key={l}
              selected={layout === l}
              onClick={() => {
                setLayout(l);
                if (props.bookExists) setNotice(l === "panoramic" || layout === "panoramic" ? "layout.change_later.regen" : null);
                save({ layout: l });
              }}
              className="flex flex-col"
            >
              <span className="font-semibold">{t(LAYOUT_KEYS[l].name)}</span>
              <span className="text-sm font-normal text-ink/65">{t(LAYOUT_KEYS[l].help)}</span>
            </Chip>
          ))}
        </div>
      </fieldset>
      {notice && <Notice tone="warn">{t(notice)}</Notice>}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">{t("configurator.format.label")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {BOOK_FORMATS.map((f) => (
            <Chip key={f} selected={format === f} onClick={() => { setFormat(f); save({ format: f }); }}>
              {t(`book.format.${f}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <Disclosure summary={t("common.more_options")}>
        <p className="text-sm text-ink/70">{t("layout.change_later.free")}</p>
        <OptionGroup label={t("cover.design")} ids={COVER_DESIGNS} value={look.cover} labelOf={(id) => t(`book.cover.${id}`)} onPick={(id) => setOption("cover", id)} />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("cover.theme")}</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={look.theme === id}
                aria-label={t(`book.theme.${id}`)}
                title={t(`book.theme.${id}`)}
                onClick={() => setOption("theme", id)}
                className={cx(
                  "flex size-12 overflow-hidden rounded-full border-4 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40",
                  look.theme === id ? "border-brand-orange-dark" : "border-white ring-1 ring-ink/15"
                )}
              >
                <span className="h-full w-1/2" style={{ backgroundColor: THEME_SPECS[id].accent }} />
                <span className="h-full w-1/2" style={{ backgroundColor: THEME_SPECS[id].soft }} />
              </button>
            ))}
          </div>
        </fieldset>
        <OptionGroup label={t("cover.font")} ids={FONT_PAIRS} value={look.fontPair} labelOf={(id) => t(`book.font.${id}`)} onPick={(id) => setOption("fontPair", id)} />
        <OptionGroup label={t("cover.title_position")} ids={TITLE_POSITIONS} value={look.titlePosition} labelOf={(id) => t(`book.title_position.${id}`)} onPick={(id) => setOption("titlePosition", id)} />
        <OptionGroup label={t("cover.endpapers")} ids={ENDPAPERS} value={look.endpaper} labelOf={(id) => t(`book.endpaper.${id}`)} onPick={(id) => setOption("endpaper", id)} />
        <div className="flex flex-col divide-y divide-ink/10">
          <Toggle checked={look.frames} onChange={(v) => setOption("frames", v)} label={t("cover.frames")} />
          <Toggle checked={look.backPortrait} onChange={(v) => setOption("backPortrait", v)} label={t("cover.back_portrait")} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("activities.title")}</legend>
          <p className="text-sm text-ink/65">{t("activities.help", undefined, heroCtx)}</p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITIES.map((a) => (
              <Chip key={a} selected={look.activities.includes(a)} disabled={!look.activities.includes(a) && look.activities.length >= ACTIVITY_PICK_COUNT} onClick={() => toggleActivity(a)}>
                {t(`activities.${a}`)}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-ink/65" aria-live="polite">{t("configurator.look.activities_count", { n: look.activities.length, total: ACTIVITY_PICK_COUNT })}</p>
        </fieldset>
        <div className="flex flex-col divide-y divide-ink/10">
          <Toggle checked={look.parentGuide} onChange={(v) => setOption("parentGuide", v)} label={t("activities.parent_guide")} />
          <Toggle checked={look.parentLetter} onChange={(v) => setOption("parentLetter", v)} label={t("activities.parent_letter")} />
          <Toggle checked={look.coloringBook} onChange={(v) => setOption("coloringBook", v)} label={t("activities.coloring", { price: props.prices.coloring })} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("book.pages")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {([32, 40] as const).map((n, i) => (
              <Chip key={n} selected={pageCount === n} disabled={props.forced40 && n === 32} onClick={() => { setPageCount(n); save({ pageCount: n }); }}>
                {pageLabels[i]}
              </Chip>
            ))}
          </div>
        </fieldset>
      </Disclosure>

      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        {props.canGenerate ? (
          <Button
            className="w-full sm:w-auto"
            pending={generating}
            disabled={saving}
            onClick={() =>
              startGenerate(async () => {
                const result = await generateBookAction(projectId!);
                if (!result.ok) return setError(result.error);
                router.push(stepHref(market, projectId!, 7));
              })
            }
          >
            {t("layout.generate")}
          </Button>
        ) : (
          props.bookExists && (
            <Button className="w-full sm:w-auto" onClick={() => router.push(stepHref(market, projectId!, 8))}>
              {t("common.continue")}
            </Button>
          )
        )}
      </StepFooter>
    </>
  );
}

function OptionGroup<T extends string>({ label, ids, value, labelOf, onPick }: { label: string; ids: readonly T[]; value: T; labelOf: (id: T) => string; onPick: (id: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <Chip key={id} selected={value === id} onClick={() => onPick(id)}>
            {labelOf(id)}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
