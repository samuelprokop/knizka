"use client";

import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { APPEARANCE_CHOICES, SWATCH, type Appearance } from "../model";
import { Chip, cx, splitOptions, Toggle } from "./ui";

type ChoiceKey = keyof typeof APPEARANCE_CHOICES;

const LABELS: Record<ChoiceKey, MessageKey> = {
  hairColor: "hero.edit.hair_color",
  hairLength: "hero.edit.hair_length",
  hairstyle: "hero.edit.hairstyle",
  eyes: "hero.edit.eyes",
  skin: "hero.edit.skin",
  outfitColor: "hero.edit.outfit_color",
  accessory: "hero.edit.accessory",
};

const SWATCHED: ChoiceKey[] = ["hairColor", "eyes", "skin", "outfitColor"];

type FlagKey = "glasses" | "freckles" | "braces" | "hearingAid" | "wheelchair";
const FLAG_LABELS: Record<FlagKey, MessageKey> = {
  glasses: "hero.edit.glasses",
  freckles: "describe.freckles",
  braces: "hero.edit.braces",
  hearingAid: "hero.edit.hearing_aid",
  wheelchair: "hero.edit.wheelchair",
};

/**
 * Vizuálne prepínače vzhľadu – farby ako vzorkovník (text je v aria-label),
 * ostatné ako čipy. Použité pri opise dieťaťa (krok 2) aj „Upraviť podobu“ (krok 3).
 */
export function AppearancePicker({
  value,
  onChange,
  choices,
  flags,
  columns = 2,
}: {
  value: Appearance;
  onChange: (next: Appearance) => void;
  choices: ChoiceKey[];
  flags: FlagKey[];
  /** Od lg dva stĺpce (celá šírka kroku) alebo jeden (v úzkom stĺpci). */
  columns?: 1 | 2;
}) {
  const { t } = useI18n();

  return (
    <div className={cx("grid gap-x-10 gap-y-4", columns === 2 && "lg:grid-cols-2")}>
      {choices.map((key) => {
        const { ids, labels } = APPEARANCE_CHOICES[key];
        const names = splitOptions(t(labels));
        const current = value[key];
        const swatch = SWATCHED.includes(key);
        return (
          <fieldset key={key} className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">
              {t(LABELS[key])}
              {/* Farebné kolieska nemajú text – vybraný odtieň slovom. */}
              {swatch && current && <span className="font-normal text-ink/60"> · {names[ids.indexOf(current as never)]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ids.map((id, i) =>
                swatch ? (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={current === id}
                    aria-label={names[i]}
                    title={names[i]}
                    onClick={() => onChange({ ...value, [key]: id })}
                    className={cx(
                      "size-11 rounded-full outline-none transition focus-visible:ring-4 focus-visible:ring-brand-orange/40",
                      current === id ? "ring-3 ring-brand-orange ring-offset-2 ring-offset-white" : "ring-1 ring-ink/15 hover:ring-ink/35"
                    )}
                    style={{ backgroundColor: SWATCH[id] }}
                  />
                ) : (
                  <Chip key={id} shape="pill" selected={current === id} onClick={() => onChange({ ...value, [key]: id })} className="min-h-11 py-1.5 text-sm lg:min-h-10">
                    {names[i]}
                  </Chip>
                )
              )}
            </div>
          </fieldset>
        );
      })}
      <div className={cx("grid gap-x-10", columns === 2 && "lg:col-span-2 lg:grid-cols-2")}>
        {flags.map((flag) => (
          <Toggle key={flag} checked={!!value[flag]} onChange={(v) => onChange({ ...value, [flag]: v })} label={t(FLAG_LABELS[flag])} />
        ))}
      </div>
    </div>
  );
}
