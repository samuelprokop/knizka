import "server-only";

import { and, eq } from "drizzle-orm";

import { getMarket, isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { personalPageUrl } from "@/features/book/server/versions";
import { nameContextOf } from "@/features/configurator/server/bundle";
import { sendProjectLink } from "@/features/configurator/server/projects";
import { createTranslator } from "@/i18n/format";
import { siteUrl } from "@/lib/site-url";
import { getMailer } from "@/server/email";
import { hasMarketingConsent } from "../lifecycle";
import type { JobContext, JobHandler, LifecycleEmailPayload } from "../types";

type Status = (typeof schema.projects.$inferSelect)["status"];

/** Stav, v ktorom má e-mail ešte zmysel – inak sa ticho neodošle (zákazník medzitým pokračoval). */
const STILL_RELEVANT: Record<LifecycleEmailPayload["kind"], Status[]> = {
  reminder_preview: ["preview"],
  reminder_cart: ["approved_by_customer"],
  review_request: ["printing", "shipped", "delivered"],
};

export const lifecycleEmailHandler: JobHandler<"lifecycle_email"> = {
  async run({ kind }: LifecycleEmailPayload, ctx: JobContext) {
    if (!ctx.projectId) return;
    const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, ctx.projectId) });
    if (!project?.email || !isMarketCode(project.market)) return;
    if (!STILL_RELEVANT[kind].includes(project.status)) return;
    if (!(await hasMarketingConsent(project.id))) return;

    if (kind === "review_request") {
      const hero = await db.query.characters.findFirst({
        where: and(eq(schema.characters.projectId, project.id), eq(schema.characters.role, "hero")),
      });
      if (!hero) return;
      const t = createTranslator(getMarket(project.market).uiLanguage);
      await getMailer().send({
        to: project.email,
        kind: "review_request",
        subject: t("email.subject.review", undefined, nameContextOf(hero)),
        // PLACEHOLDER: odkaz na hodnotenie (Judge.me / Heureka Overené zákazníkmi, A4) – zatiaľ osobná stránka knihy.
        url: personalPageUrl(project.market, project.personalToken),
      });
      return;
    }

    // Nový jednorazový odkaz vráti zákazníka presne na krok, kde skončil (náhľad alebo košík).
    await sendProjectLink(project.id, siteUrl(), "reminder");
  },

  async onExhausted() {
    // Pripomienka nie je kritická – po vyčerpaní pokusov sa jednoducho nepošle.
  },
};
