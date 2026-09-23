"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CASE_KEYS, type NameForms } from "@/lib/language";
import { approveNameReviewAction, rejectNameReviewAction } from "../actions/names";
import { Button, Field, Input, Notice, Textarea } from "./ui";

export type NameReviewTaskView = {
  id: string;
  name: string;
  language: string;
  gender: "girl" | "boy";
  proposedForms: NameForms;
  customerForms: NameForms | null;
  declinable: boolean;
};

export function NameReviewDetail({ task }: { task: NameReviewTaskView }) {
  const router = useRouter();
  const [forms, setForms] = useState<NameForms>(task.customerForms ?? task.proposedForms);
  const [declinable, setDeclinable] = useState(task.declinable);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveNameReviewAction(task.id, forms, declinable, note || undefined);
      if (!result.ok) return setError(result.error);
      router.push("/admin/slovnik/fronta");
      router.refresh();
    });
  };

  const reject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectNameReviewAction(task.id, note);
      if (!result.ok) return setError(result.error);
      router.push("/admin/slovnik/fronta");
      router.refresh();
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-ink/10 bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink/50">Meno</p>
          <p className="font-medium text-ink">{task.name}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50">Jazyk</p>
          <p className="font-medium text-ink">{task.language}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50">Rod</p>
          <p className="font-medium text-ink">{task.gender === "girl" ? "dievča" : "chlapec"}</p>
        </div>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 rounded-xl border border-ink/10 bg-white p-4 sm:grid-cols-4">
        <legend className="mb-1 px-1 text-sm font-medium text-ink/80">
          Tvary {task.customerForms ? "(navrhnuté zákazníkom)" : "(návrh pravidlami)"}
        </legend>
        {CASE_KEYS.map((key) => (
          <Field key={key} label={key} htmlFor={`review-${key}`}>
            <Input id={`review-${key}`} value={forms[key]} onChange={(e) => setForms((prev) => ({ ...prev, [key]: e.target.value }))} />
          </Field>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" checked={declinable} onChange={(e) => setDeclinable(e.target.checked)} className="size-4" />
        Meno sa skloňuje
      </label>

      <Field label="Poznámka" htmlFor="note" hint="Pri schválení voliteľná; pri zamietnutí povinná (uvidí ju zákazník).">
        <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex gap-2">
        <Button onClick={approve} pending={pending}>
          Schváliť
        </Button>
        <Button variant="danger" onClick={reject} pending={pending}>
          Zamietnuť
        </Button>
      </div>
    </div>
  );
}
