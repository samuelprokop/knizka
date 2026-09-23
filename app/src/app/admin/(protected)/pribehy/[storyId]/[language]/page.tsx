import { notFound } from "next/navigation";

import type { StyleId } from "@/config/catalog";
import type { DetailSlot } from "@/features/configurator/model";
import { EditionEditor } from "@/features/admin/components/EditionEditor";
import { PageHeader } from "@/features/admin/components/ui";
import { getLatestEdition, getStory } from "@/features/admin/server/stories";
import { requireAdminPage } from "@/features/admin/server/session";
import { isBookLanguage } from "@/i18n/locales";

export default async function EditionEditorPage({ params }: PageProps<"/admin/pribehy/[storyId]/[language]">) {
  await requireAdminPage("pribehy");
  const { storyId, language: languageParam } = await params;
  if (!isBookLanguage(languageParam)) notFound();

  const story = await getStory(storyId);
  if (!story) notFound();
  const edition = await getLatestEdition(storyId, languageParam);

  return (
    <div>
      <PageHeader title={`${story.slug} – edícia ${languageParam}`} description={`Kategória: ${story.category} · vek ${story.ageMin}–${story.ageMax}`} />
      <EditionEditor
        storyId={story.id}
        language={languageParam}
        styles={story.styles as StyleId[]}
        spreadCount={story.spreads}
        currentVersion={edition?.version ?? null}
        initial={{
          title: edition?.title ?? "",
          annotation: edition?.annotation ?? "",
          developmentGoal: edition?.developmentGoal ?? "",
          author: edition?.author ?? "",
          detailSlots: (edition?.detailSlots ?? []) as DetailSlot[],
          spreads: (edition?.spreads ?? []).map((s) => ({ text: s.text, fallbackText: s.fallbackText ?? "", scene: s.scene ?? "" })),
        }}
      />
    </div>
  );
}
