import { eq } from "drizzle-orm";
import Link from "next/link";

import { db, schema } from "@/db";
import { getMarketContext } from "@/i18n/server";
import { ResendLinkButton } from "./ResendLinkButton";
import { buttonClass, StepTitle } from "./ui";

/** j***@gmail.com – zákazník spozná svoj e-mail, cudzí človek sa ho nedozvie. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

/** Zariadenie bez prístupu k projektu (iný prehliadač, zmazané cookies, starý odkaz). */
export async function SessionExpired({ projectId }: { projectId?: string }) {
  const { market, t } = await getMarketContext();
  const [project] = projectId
    ? await db.select({ email: schema.projects.email, market: schema.projects.market }).from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1)
    : [];
  const email = project?.email && project.market === market.code ? project.email : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 bg-paper px-4 py-16">
      <StepTitle title={t("configurator.link.title")} subtitle={email ? t("error.session_expired", { email: maskEmail(email) }) : t("configurator.link.no_project")} />
      {email && projectId && <ResendLinkButton projectId={projectId} />}
      <Link href={`/${market.code}/vytvorit`} className={buttonClass("secondary", "self-start")}>
        {t("configurator.link.new_book")}
      </Link>
    </main>
  );
}
