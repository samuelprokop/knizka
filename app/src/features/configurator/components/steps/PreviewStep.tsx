"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import type { LayoutId } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { editPageImageAction, editPageTextAction, reportPageAction, rewritePageAction, undoPageAction } from "../../actions/book";
import type { LookOptions } from "../../model";
import { stepHref } from "../../steps";
import { AutoRefresh } from "../AutoRefresh";
import { SampleSpread } from "../SampleSpread";
import { StepFooter } from "../StepFooter";
import { Button, Chip, cx, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";

export type PreviewPage = {
  id: string;
  position: number;
  kind: string;
  status: string;
  text: string | null;
  url: string | null;
  edited: boolean;
  canUndo: boolean;
  original: string | null;
};

type Props = {
  pages: PreviewPage[];
  layout: LayoutId;
  look: Pick<LookOptions, "theme" | "font" | "frames">;
  rewritesLeft: number;
  imageEditsLeft: number;
  editorial: boolean;
  /** Meno postavy v lokáli pre pokyn „viac o …“. */
  rewriteCharacter: string | null;
};

const PAGE_TEXT_MAX = 400;

/** Krok 8: listovací náhľad s vodoznakom; „Upraviť“ pri každej strane otvorí editor (K8.1 – K8.5). */
export function PreviewStep(props: Props) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const touch = useRef<number | null>(null);
  const page = props.pages[index];
  const busy = props.pages.some((p) => p.status === "generating" || p.status === "pending");
  const edited = props.pages.filter((p) => p.edited).length;

  const go = (next: number) => {
    setIndex(Math.min(props.pages.length - 1, Math.max(0, next)));
    setEditing(false);
  };

  return (
    <>
      <AutoRefresh active={busy} />
      <StepTitle title={t("preview.title")} subtitle={t("preview.watermark_hint")} />

      <section
        aria-roledescription={t("configurator.preview.book")}
        aria-label={page.position === 0 ? t("configurator.preview.cover") : t("editor.title", { n: page.position })}
        className="relative select-none"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div key={page.id} className="motion-safe:transition-opacity">
          {page.kind === "cover" ? (
            <div className="mx-auto aspect-square w-2/3 overflow-hidden rounded-2xl shadow-md">
              {page.url && (
                // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
                <img src={page.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ) : (
            <SampleSpread layout={props.layout} look={props.look} text={page.text ?? ""} image={page.url} imageAlt="" pending={page.status !== "ready"} />
          )}
        </div>
        {/* Vodoznak – jemný, cez obrázky; text ostáva čitateľný na kontrolu. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
          <span className="-rotate-12 font-heading text-5xl font-extrabold tracking-widest text-ink/10 sm:text-7xl">{t("configurator.preview.watermark")}</span>
        </div>
        {page.status !== "ready" && (
          <p className="absolute top-2 left-2 rounded-full bg-white/90 px-3 py-1 text-sm font-medium">
            {page.status === "needs_review" ? t("gen.page_for_human") : t("editor.preparing")}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" disabled={index === 0} onClick={() => go(index - 1)} aria-label={t("configurator.preview.prev")}>←</Button>
        <p className="text-sm font-medium text-ink/70" aria-live="polite">
          {page.position === 0 ? t("configurator.preview.cover") : t("editor.title", { n: page.position })} · {index + 1}/{props.pages.length}
        </p>
        <Button variant="secondary" disabled={index === props.pages.length - 1} onClick={() => go(index + 1)} aria-label={t("configurator.preview.next")}>→</Button>
      </div>

      <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2" aria-label={t("configurator.preview.thumbs")}>
        {props.pages.map((p, i) => (
          <li key={p.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === index || undefined}
              aria-label={p.position === 0 ? t("configurator.preview.cover") : t("editor.title", { n: p.position })}
              className={cx("relative block h-14 w-24 overflow-hidden rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40", i === index ? "ring-4 ring-brand-orange" : "ring-1 ring-ink/10")}
            >
              {p.url && (
                // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              )}
              {p.edited && <span className="absolute right-1 bottom-1 rounded-full bg-brand-teal px-1.5 text-[10px] font-bold text-white">✎</span>}
            </button>
          </li>
        ))}
      </ol>

      {page.kind !== "cover" && !editing && (
        <Button variant="secondary" className="self-start" onClick={() => setEditing(true)} disabled={page.status === "generating"}>
          ✎ {t("preview.edit_page")}
        </Button>
      )}
      {editing && page.kind !== "cover" && <PageEditor key={page.id} page={page} {...props} onClose={() => setEditing(false)} />}

      {edited > 0 && <Notice>{t("editor.summary", { n: edited })}</Notice>}
      <StepFooter>
        <Button className="w-full sm:w-auto" disabled={busy} onClick={() => router.push(stepHref(market, projectId!, 9))}>
          {t("preview.like")}
        </Button>
      </StepFooter>
    </>
  );
}

function PageEditor({ page, rewritesLeft, imageEditsLeft, editorial, rewriteCharacter, onClose }: Props & { page: PreviewPage; onClose: () => void }) {
  const { t } = useI18n();
  const { projectId, bookLanguage } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [tab, setTab] = useState<"text" | "image" | "report">("text");
  const [text, setText] = useState(page.text ?? "");
  const [instruction, setInstruction] = useState("");
  const [imageInstruction, setImageInstruction] = useState("");
  const [compare, setCompare] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [done, setDone] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: MessageKey }>, doneKey?: MessageKey) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error ?? "error.generic");
      setError(null);
      setDone(doneKey ?? null);
      router.refresh();
    });

  const rewriteOptions = splitOptions(t("text.rewrite.options", { character: rewriteCharacter ?? "" })).filter((_, i) => i !== 3 || !!rewriteCharacter);
  const imageGroups: MessageKey[] = ["editor.image.expression", "editor.image.time", "editor.image.weather", "editor.image.shot"];
  const limitsOut = imageEditsLeft <= 0;

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-ink/10" aria-labelledby={`${ids}-title`}>
      <div className="flex items-center justify-between">
        <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">{t("editor.title", { n: page.position })}</h2>
        <Button variant="ghost" onClick={onClose}>{t("common.done")}</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["text", "image", "report"] as const).map((k) => (
          <Chip key={k} selected={tab === k} onClick={() => setTab(k)} className="text-center text-sm">
            {t(k === "text" ? "editor.text" : k === "image" ? "editor.image" : "preview.report")}
          </Chip>
        ))}
      </div>

      {tab === "text" && (
        <div className="flex flex-col gap-3">
          <Field label={t("editor.text")} htmlFor={`${ids}-text`} help={t("editor.text.counter", { n: text.length, max: PAGE_TEXT_MAX })}>
            <textarea id={`${ids}-text`} lang={bookLanguage} className={`${inputClass} min-h-32 py-3`} maxLength={PAGE_TEXT_MAX} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          {editorial && <p className="text-sm text-ink/65">{t("editor.text.editorial_note")}</p>}
          <Button pending={pending} disabled={!text.trim() || text === page.text} onClick={() => run(() => editPageTextAction(projectId!, page.id, text), "common.saved")}>
            {t("common.done")}
          </Button>
          <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
            <p className="text-sm font-semibold">{t("editor.rewrite")}</p>
            <div className="flex flex-wrap gap-2">
              {rewriteOptions.map((o) => (
                <Chip key={o} selected={instruction === o} onClick={() => setInstruction(o)}>{o}</Chip>
              ))}
            </div>
            <input className={inputClass} maxLength={200} value={instruction} onChange={(e) => setInstruction(e.target.value)} aria-label={t("editor.image.custom")} />
            <p className="text-sm text-ink/65">{t("editor.counter.rewrites", { n: rewritesLeft })}</p>
            <Button variant="secondary" pending={pending} disabled={!instruction.trim() || rewritesLeft <= 0} onClick={() => run(() => rewritePageAction(projectId!, page.id, instruction))}>
              {t("editor.rewrite")}
            </Button>
          </div>
        </div>
      )}

      {tab === "image" && (
        <div className="flex flex-col gap-3">
          {limitsOut ? (
            <Notice tone="warn">{t("editor.limits_exhausted", { price: t("configurator.price.on_request") })}</Notice>
          ) : (
            <>
              {!editorial ? null : <p className="text-sm text-ink/65">{t("editor.image.limited")}</p>}
              {imageGroups.map((key) => {
                const [label, values] = t(key).split(": ");
                return (
                  <fieldset key={key} className="flex flex-col gap-2">
                    <legend className="text-sm font-semibold">{label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {splitOptions(values ?? "").map((v) => (
                        <Chip key={v} selected={imageInstruction === `${label}: ${v}`} onClick={() => setImageInstruction(`${label}: ${v}`)}>{v}</Chip>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
              <Field label={t("editor.image.custom")} htmlFor={`${ids}-img`}>
                <input id={`${ids}-img`} className={inputClass} maxLength={200} value={imageInstruction} onChange={(e) => setImageInstruction(e.target.value)} />
              </Field>
              <p className="text-sm text-ink/65">{t("editor.counter.images", { n: imageEditsLeft })}</p>
              <Button pending={pending} disabled={!imageInstruction.trim()} onClick={() => run(() => editPageImageAction(projectId!, page.id, imageInstruction), "editor.preparing")}>
                {t("editor.image")}
              </Button>
            </>
          )}
          <p className="text-sm text-ink/65">{t("editor.mobile_hint")}</p>
        </div>
      )}

      {tab === "report" && (
        <div className="flex flex-wrap gap-2">
          {splitOptions(t("preview.report.options")).map((o) => (
            <Chip key={o} selected={false} onClick={() => run(() => reportPageAction(projectId!, page.id, o), "configurator.preview.reported")}>{o}</Chip>
          ))}
        </div>
      )}

      {page.original && page.edited && (
        <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
          <div className="flex flex-wrap gap-2">
            {page.canUndo && (
              <Button variant="secondary" pending={pending} onClick={() => run(() => undoPageAction(projectId!, page.id))}>↶ {t("common.undo")}</Button>
            )}
            <Button variant="ghost" onClick={() => setCompare(!compare)} aria-expanded={compare}>{t("editor.compare")}</Button>
          </div>
          {compare && <p lang={bookLanguage} className="rounded-2xl bg-paper p-3 text-sm text-ink/80">{page.original}</p>}
        </div>
      )}
      {done && <Notice tone="ok">{t(done)}</Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
    </section>
  );
}
