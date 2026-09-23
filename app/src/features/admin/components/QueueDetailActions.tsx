"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approveQueueItemAction, returnQueueItemAction } from "../actions/queue";
import { Button, Field, Notice, Textarea } from "./ui";

export function QueueDetailActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveQueueItemAction(projectId);
      if (!result.ok) return setError(result.error);
      router.push("/admin/fronta");
      router.refresh();
    });
  };

  const returnBook = () => {
    setError(null);
    startTransition(async () => {
      const result = await returnQueueItemAction(projectId, note);
      if (!result.ok) return setError(result.error);
      router.push("/admin/fronta");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white p-4">
      <Field label="Poznámka pri vrátení" htmlFor="note" hint="Povinná – uvidí ju výroba/redaktor pri oprave.">
        <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button onClick={approve} pending={pending}>
          Schváliť do tlače
        </Button>
        <Button variant="danger" onClick={returnBook} pending={pending}>
          Vrátiť s poznámkou
        </Button>
      </div>
    </div>
  );
}
