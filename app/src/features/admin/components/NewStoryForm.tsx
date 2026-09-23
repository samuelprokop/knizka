"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { STYLES, type StyleId } from "@/config/catalog";
import { createStoryAction } from "../actions/stories";
import { CATEGORY_LABELS, STORY_CATEGORIES, type StoryCategory } from "../story-categories";
import { Button, Field, Input, Notice, Select } from "./ui";

const STYLE_LABELS: Record<StyleId, string> = {
  watercolor: "Akvarel",
  modern: "Moderný",
  animated: "Animovaný",
  crayon: "Pastelky",
};

export function NewStoryForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<StoryCategory>("adventure");
  const [ageMin, setAgeMin] = useState(3);
  const [ageMax, setAgeMax] = useState(8);
  const [spreads, setSpreads] = useState<12 | 16>(12);
  const [styles, setStyles] = useState<StyleId[]>([...STYLES]);
  const [companionSlots, setCompanionSlots] = useState(1);
  const [needsGuide, setNeedsGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleStyle = (style: StyleId) =>
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createStoryAction({ slug, category, ageMin, ageMax, spreads, styles, companionSlots, needsGuide });
      if (!result.ok) return setError(result.error);
      router.push(`/admin/pribehy/${result.data.id}/sk`);
    });
  };

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Slug" htmlFor="slug" hint="Jedinečný identifikátor, napr. „vylet-do-lesa“.">
        <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>

      <Field label="Kategória" htmlFor="category">
        <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as StoryCategory)}>
          {STORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Vek od" htmlFor="ageMin">
          <Input id="ageMin" type="number" min={0} max={18} required value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} />
        </Field>
        <Field label="Vek do" htmlFor="ageMax">
          <Input id="ageMax" type="number" min={0} max={18} required value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Počet dvojstrán" htmlFor="spreads">
        <Select id="spreads" value={spreads} onChange={(e) => setSpreads(Number(e.target.value) as 12 | 16)}>
          <option value={12}>12 (32 strán)</option>
          <option value={16}>16 (40 strán)</option>
        </Select>
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink/80">Štýly, v ktorých má príbeh scény</legend>
        <div className="flex flex-wrap gap-3">
          {STYLES.map((style) => (
            <label key={style} className="flex items-center gap-2 text-sm text-ink/80">
              <input type="checkbox" checked={styles.includes(style)} onChange={() => toggleStyle(style)} className="size-4" />
              {STYLE_LABELS[style]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Miesto pre ďalšie postavy (0–3)" htmlFor="companionSlots">
        <Input
          id="companionSlots"
          type="number"
          min={0}
          max={3}
          value={companionSlots}
          onChange={(e) => setCompanionSlots(Number(e.target.value))}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" checked={needsGuide} onChange={(e) => setNeedsGuide(e.target.checked)} className="size-4" />
        Príbeh potrebuje sprievodcu
      </label>

      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" pending={pending} className="w-fit">
        Vytvoriť a napísať edíciu
      </Button>
    </form>
  );
}
