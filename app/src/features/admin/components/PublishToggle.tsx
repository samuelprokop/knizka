"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setStoryPublishedAction } from "../actions/stories";
import { Badge } from "./ui";

export function PublishToggle({ storyId, published }: { storyId: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await setStoryPublishedAction(storyId, !published);
      if (result.ok) router.refresh();
    });
  };

  return (
    <button type="button" onClick={toggle} disabled={pending} className="disabled:opacity-50">
      <Badge tone={published ? "success" : "neutral"}>{published ? "áno – zrušiť" : "nie – publikovať"}</Badge>
    </button>
  );
}
