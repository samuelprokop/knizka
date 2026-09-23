"use client";

import { useState, useTransition } from "react";

import { LAYOUTS, type StyleId } from "@/config/catalog";
import { DETAIL_SLOTS, type DetailSlot } from "@/features/configurator/model";
import { DEFAULT_THEME_FOR_STYLE } from "@/features/book/design";
import { SampleSpread, type SampleSpreadData } from "@/features/book/components/SampleSpread";
import type { BookLanguage } from "@/i18n/locales";
import type { EditionCheck } from "../server/stories";
import { checkEditionAction, previewDraftSpreadAction, publishEditionAction } from "../actions/stories";
import { Badge, Button, Field, Notice, Textarea } from "./ui";

const DETAIL_LABELS: Record<DetailSlot, string> = {
  toy: "hračka",
  food: "jedlo",
  place: "miesto",
  hobby: "záľuba",
  city: "mesto",
  kindergarten: "škôlka/škola",
  teacher: "učiteľka",
  friend: "kamarát",
};

export type SpreadDraft = { text: string; fallbackText: string; scene: string };

export type EditionEditorInitial = {
  title: string;
  annotation: string;
  developmentGoal: string;
  author: string;
  detailSlots: DetailSlot[];
  spreads: SpreadDraft[];
};

export function EditionEditor({
  storyId,
  language,
  styles,
  spreadCount,
  initial,
  currentVersion,
}: {
  storyId: string;
  language: BookLanguage;
  styles: StyleId[];
  spreadCount: number;
  initial: EditionEditorInitial;
  currentVersion: number | null;
}) {
  const [title, setTitle] = useState(initial.title);
  const [annotation, setAnnotation] = useState(initial.annotation);
  const [developmentGoal, setDevelopmentGoal] = useState(initial.developmentGoal);
  const [author, setAuthor] = useState(initial.author);
  const [detailSlots, setDetailSlots] = useState<DetailSlot[]>(initial.detailSlots);
  const [spreads, setSpreads] = useState<SpreadDraft[]>(
    Array.from({ length: spreadCount }, (_, i) => initial.spreads[i] ?? { text: "", fallbackText: "", scene: "" })
  );

  const [check, setCheck] = useState<EditionCheck | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewStyle, setPreviewStyle] = useState<StyleId | undefined>(styles[0]);
  const [previewData, setPreviewData] = useState<SampleSpreadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewPending, startPreviewTransition] = useTransition();

  const updateSpread = (index: number, patch: Partial<SpreadDraft>) =>
    setSpreads((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const toggleDetail = (slot: DetailSlot) =>
    setDetailSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  const draft = { title, annotation, developmentGoal, author, detailSlots, spreads };

  const runCheck = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkEditionAction(draft, language);
      if (!result.ok) return setError(result.error);
      setCheck(result.data);
    });
  };

  const publish = () => {
    setError(null);
    startTransition(async () => {
      const result = await publishEditionAction(storyId, language, draft);
      if (!result.ok) return setError(result.error);
      setPublishedVersion(result.data.version);
      const recheck = await checkEditionAction(draft, language);
      if (recheck.ok) setCheck(recheck.data);
    });
  };

  const loadPreview = () => {
    if (!previewStyle) return;
    startPreviewTransition(async () => {
      const result = await previewDraftSpreadAction(language, previewStyle, spreads[previewIndex]);
      if (result.ok) setPreviewData(result.data);
    });
  };

  const issuesFor = (field: "title" | "annotation" | "text" | "fallbackText", spread?: number) =>
    check?.issues.filter((i) => i.field === field && i.spread === spread) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-sm text-ink/60">
        {currentVersion ? <span>Aktuálna publikovaná verzia: v{currentVersion}</span> : <span>Zatiaľ nepublikované</span>}
        {publishedVersion && <Badge tone="success">Publikovaná verzia {publishedVersion}</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Názov" htmlFor="title">
          <Textarea id="title" rows={1} value={title} onChange={(e) => setTitle(e.target.value)} />
          <IssueList issues={issuesFor("title")} />
        </Field>
        <Field label="Autor" htmlFor="author">
          <Textarea id="author" rows={1} value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
      </div>

      <Field label="Anotácia" htmlFor="annotation">
        <Textarea id="annotation" rows={2} value={annotation} onChange={(e) => setAnnotation(e.target.value)} />
        <IssueList issues={issuesFor("annotation")} />
      </Field>

      <Field label="Rozvojový cieľ" htmlFor="goal" hint="Čo príbeh dieťaťu rozvíja (voliteľné, pre redaktora a rodiča).">
        <Textarea id="goal" rows={2} value={developmentGoal} onChange={(e) => setDevelopmentGoal(e.target.value)} />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink/80">Voľné miesta pre vlastné detaily (cesta B)</legend>
        <div className="flex flex-wrap gap-3">
          {DETAIL_SLOTS.map((slot) => (
            <label key={slot} className="flex items-center gap-2 text-sm text-ink/80">
              <input type="checkbox" checked={detailSlots.includes(slot)} onChange={() => toggleDetail(slot)} className="size-4" />
              {DETAIL_LABELS[slot]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-ink">Dvojstrany ({spreads.length})</h2>
        {spreads.map((spread, index) => {
          const fit = check?.layoutFit.find((f) => f.spread === index);
          return (
            <div key={index} className="rounded-xl border border-ink/10 bg-white p-4">
              <p className="mb-2 text-xs font-medium text-ink/50">Dvojstrana {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Text" htmlFor={`text-${index}`}>
                  <Textarea id={`text-${index}`} rows={3} value={spread.text} onChange={(e) => updateSpread(index, { text: e.target.value })} />
                  <IssueList issues={issuesFor("text", index)} />
                </Field>
                <Field label="Záložná veta (bez skloňovania)" htmlFor={`fallback-${index}`} hint="Pre nesklonné mená – nominatív alebo bez mena.">
                  <Textarea
                    id={`fallback-${index}`}
                    rows={3}
                    value={spread.fallbackText}
                    onChange={(e) => updateSpread(index, { fallbackText: e.target.value })}
                  />
                  <IssueList issues={issuesFor("fallbackText", index)} />
                </Field>
              </div>
              <Field label="Opis scény (pre generátor ilustrácií)" htmlFor={`scene-${index}`} hint="Bez textu v obrázku.">
                <Textarea id={`scene-${index}`} rows={2} value={spread.scene} onChange={(e) => updateSpread(index, { scene: e.target.value })} />
              </Field>
              {fit && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-ink/50">Najdlhší testovací zápis: {fit.maxLength} znakov · zmestí sa do (A5):</span>
                  {LAYOUTS.map((layout) => (
                    <Badge key={layout} tone={fit.fits[layout] ? "success" : "danger"}>
                      {layout}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {check && (
        <Notice tone={check.ok ? "success" : "error"}>
          {check.ok ? "Bez chýb pripravených na publikovanie." : `${check.issues.filter((i) => i.severity === "error").length} chýb treba opraviť.`}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={runCheck} pending={pending}>
          Skontrolovať
        </Button>
        <Button onClick={publish} pending={pending} disabled={check !== null && !check.ok}>
          Publikovať novú verziu
        </Button>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Náhľad dvojstrany</h2>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Field label="Dvojstrana" htmlFor="preview-index">
            <select
              id="preview-index"
              value={previewIndex}
              onChange={(e) => setPreviewIndex(Number(e.target.value))}
              className="min-h-10 rounded-lg border border-ink/20 px-3 text-sm"
            >
              {spreads.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Štýl" htmlFor="preview-style">
            <select
              id="preview-style"
              value={previewStyle}
              onChange={(e) => setPreviewStyle(e.target.value as StyleId)}
              className="min-h-10 rounded-lg border border-ink/20 px-3 text-sm"
            >
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="secondary" onClick={loadPreview} pending={previewPending}>
            Zobraziť ukážku
          </Button>
        </div>
        {previewData && previewStyle && (
          <div className="max-w-xl overflow-hidden rounded-lg border border-ink/10">
            <SampleSpread data={previewData} layout="classic" format="A5" theme={DEFAULT_THEME_FOR_STYLE[previewStyle]} />
          </div>
        )}
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: { severity: "error" | "warning"; message: string }[] }) {
  if (!issues.length) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {issues.map((issue, i) => (
        <li key={i} className={issue.severity === "error" ? "text-xs text-red-700" : "text-xs text-amber-700"}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
