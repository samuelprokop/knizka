import Link from "next/link";

import { Badge, Button, PageHeader } from "@/features/admin/components/ui";
import { PublishToggle } from "@/features/admin/components/PublishToggle";
import { CATEGORY_LABELS, listStories, type StoryCategory } from "@/features/admin/server/stories";
import { requireAdminPage } from "@/features/admin/server/session";

export default async function StoriesPage() {
  await requireAdminPage("pribehy");
  const stories = await listStories();

  return (
    <div>
      <PageHeader
        title="Knižnica príbehov"
        description={`${stories.length} príbehov`}
        actions={
          <Link href="/admin/pribehy/novy">
            <Button>Nový príbeh</Button>
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Kategória</th>
              <th className="px-3 py-2 font-medium">Vek</th>
              <th className="px-3 py-2 font-medium">SK</th>
              <th className="px-3 py-2 font-medium">CZ</th>
              <th className="px-3 py-2 font-medium">Publikovaný</th>
            </tr>
          </thead>
          <tbody>
            {stories.map(({ story, editions }) => (
              <tr key={story.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{story.slug}</td>
                <td className="px-3 py-2 text-ink/70">{CATEGORY_LABELS[story.category as StoryCategory] ?? story.category}</td>
                <td className="px-3 py-2 text-ink/70">
                  {story.ageMin}–{story.ageMax}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/pribehy/${story.id}/sk`} className="text-brand-orange-dark hover:underline">
                    {editions.sk ? `v${editions.sk.version}` : "vytvoriť"}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/pribehy/${story.id}/cs`} className="text-brand-orange-dark hover:underline">
                    {editions.cs ? `v${editions.cs.version}` : "vytvoriť"}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {editions.sk && editions.cs ? (
                    <PublishToggle storyId={story.id} published={story.published} />
                  ) : (
                    <Badge tone="neutral">chýba edícia</Badge>
                  )}
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink/50">
                  Zatiaľ žiadne príbehy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
