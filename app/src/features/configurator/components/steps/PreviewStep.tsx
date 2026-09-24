"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";

import { BookFlipbook } from "@/features/book/components/BookFlipbook";
import { interiorPages } from "@/features/book/model/pages";
import type { Book } from "@/features/book/model/types";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { editPageImageAction, editPageTextAction, reportPageAction, rewritePageAction, undoPageAction } from "../../actions/book";
import { stepHref } from "../../steps";
import { AutoRefresh } from "../AutoRefresh";
import { StepFooter } from "../StepFooter";
import { Button, Chip, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { UndoIcon } from "@/components/icons";
import { useToast } from "@/components/Toaster";
import { useSubStep } from "../WizardMotion";

export type PreviewPage = {
  id: string;
  /** Index časti knihy v modeli renderera (book.parts). */
  partIndex: number;
  /** Poradie dvojstrany príbehu od 1 – pre nadpis editora. */
  spread: number;
  status: string;
  text: string | null;
  edited: boolean;
  canUndo: boolean;
  original: string | null;
};

type Props = {
  /** Kniha z renderera s podpísanými URL obrázkov (withSignedImages). */
  book: Book;
  /** Dvojstrany príbehu, ktoré sa dajú upraviť. */
  pages: PreviewPage[];
  rewritesLeft: number;
  imageEditsLeft: number;
  editorial: boolean;
  /** Meno postavy v lokáli pre pokyn „viac o …“. */
  rewriteCharacter: string | null;
};

const PAGE_TEXT_MAX = 400;

/** Krok 8: listovací náhľad s vodoznakom; „Upraviť“ pri strane otvorí editor (K8.1 – K8.5). */
export function PreviewStep(props: Props) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const busy = props.pages.some((p) => p.status === "generating" || p.status === "pending");
  const edited = props.pages.filter((p) => p.edited).length;
  const page = props.pages.find((p) => p.id === selected) ?? null;

  // Číslo strany z náhľadu → časť knihy → dvojstrana príbehu v editore.
  const partOfPage = useMemo(() => new Map(interiorPages(props.book).map((p) => [p.number, p.partIndex])), [props.book]);
  const editPage = (pageNumber: number) => {
    const target = props.pages.find((p) => p.partIndex === partOfPage.get(pageNumber));
    setSelected(target?.id ?? null);
    // Osobné strany (venovanie, list, zadná strana) sa upravujú v kroku 9.
    setNotice(!target);
  };

  useSubStep(page ? t("editor.title", { n: page.spread }) : null);

  return (
    <>
      <AutoRefresh active={busy} />
      {/* Úprava strany je podstránka – kniha a editor nie sú pod sebou (bez posúvania). */}
      {page ? (
        <PageEditor key={page.id} page={page} {...props} onClose={() => setSelected(null)} />
      ) : (
        <>
          <StepTitle title={t("preview.title")} subtitle={t("preview.watermark_hint")} />
          {(notice || edited > 0) && (
            <p className="-mt-2 text-sm text-ink/65">
              {notice && t("configurator.preview.personal_pages")} {edited > 0 && t("editor.summary", { n: edited })}
            </p>
          )}
          <BookFlipbook book={props.book} onEditPage={editPage} reserveRem={36} />
          <StepFooter>
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => router.push(stepHref(market, projectId!, 9))}>
              {t("preview.like")}
            </Button>
          </StepFooter>
        </>
      )}
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
  const toast = useToast();
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: MessageKey }>, doneKey?: MessageKey) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error ?? "error.generic");
      setError(null);
      if (doneKey) toast({ title: t(doneKey), tone: "ok" });
      router.refresh();
    });

  const rewriteOptions = splitOptions(t("text.rewrite.options", { character: rewriteCharacter ?? "" })).filter((_, i) => i !== 3 || !!rewriteCharacter);
  const imageGroups: MessageKey[] = ["editor.image.expression", "editor.image.time", "editor.image.weather", "editor.image.shot"];
  const limitsOut = imageEditsLeft <= 0;

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-ink/10" aria-labelledby={`${ids}-title`}>
      <div className="flex items-center justify-between">
        <h2 id={`${ids}-title`} className="font-heading text-xl font-extrabold">{t("editor.title", { n: page.spread })}</h2>
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
              <Button variant="secondary" pending={pending} onClick={() => run(() => undoPageAction(projectId!, page.id))}><UndoIcon className="size-4" />{t("common.undo")}</Button>
            )}
            <Button variant="ghost" onClick={() => setCompare(!compare)} aria-expanded={compare}>{t("editor.compare")}</Button>
          </div>
          {compare && <p lang={bookLanguage} className="rounded-2xl bg-paper p-3 text-sm text-ink/80">{page.original}</p>}
        </div>
      )}
      {error && <Notice tone="error">{t(error)}</Notice>}
    </section>
  );
}
