import Link from "next/link";

import { isUiPreview } from "@/lib/ui-preview";

/** Plávajúci odkaz späť do katalógu obrazoviek – len v náhľade UI. */
export function UiPreviewBadge() {
  if (!isUiPreview()) return null;
  return (
    <Link
      href="/ui"
      className="fixed right-3 bottom-3 z-[100] rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-lg opacity-80 transition hover:opacity-100"
    >
      ← Katalóg UI
    </Link>
  );
}
