"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { StyleId } from "@/config/catalog";
import { Skeleton, SkeletonReveal } from "@/components/Skeleton";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import {
  approveHeroAction,
  chooseStyleAction,
  requestManualHeroAction,
  retryCardAction,
  updateAppearanceAction,
} from "../../actions/hero";
import type { Appearance } from "../../model";
import { stepHref } from "../../steps";
import { AppearancePicker } from "../AppearancePicker";
import { AutoRefresh } from "../AutoRefresh";
import { StepFooter } from "../StepFooter";
import { Button, buttonClass, Chip, cx, Notice, StepTitle } from "../ui";
import { useWizard } from "../WizardContext";
import { useSubStep } from "../WizardMotion";

export type PortraitView = { style: StyleId; status: string; url: string | null };
export type CardView = { status: string; portrait: string | null; fullBody: string | null; smile: string | null; surprise: string | null };

const REASONS = ["face", "hair", "age", "expression"] as const;

export function StyleStep(props: {
  heroId: string;
  portraits: PortraitView[];
  recommended: StyleId;
  chosenStyle: StyleId | null;
  showGrid: boolean;
  card: CardView | null;
  approved: boolean;
  retriesLeft: number;
  appearance: Appearance;
  manualRequested: boolean;
  bookExists: boolean;
}) {
  const generating = props.portraits.some((p) => p.status === "generating") || props.card?.status === "generating";
  return (
    <>
      <AutoRefresh active={generating} />
      {props.showGrid || !props.card ? <StyleGrid {...props} /> : <HeroCard {...props} card={props.card} />}
    </>
  );
}

function StyleGrid({ portraits, recommended, chosenStyle, bookExists }: Parameters<typeof StyleStep>[0]) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const router = useRouter();
  const [selected, setSelected] = useState<StyleId | null>(chosenStyle ?? recommended);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const heroCtx = hero ?? undefined;

  const readyAny = portraits.some((p) => p.status === "ready");

  return (
    <>
      <StepTitle title={t("style.title")} subtitle={t("style.subtitle", undefined, heroCtx)} />
      {!readyAny && <p className="text-sm text-ink/70" aria-live="polite">{t("style.generating", undefined, heroCtx)}</p>}
      <div role="group" aria-label={t("style.title")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {portraits.map((p) => (
          <button
            key={p.style}
            type="button"
            aria-pressed={selected === p.style}
            onClick={() => setSelected(p.style)}
            className={cx(
              "relative flex flex-col overflow-hidden rounded-3xl border-4 bg-white text-left outline-none transition focus-visible:ring-4 focus-visible:ring-brand-orange/40",
              selected === p.style ? "border-brand-orange" : "border-transparent ring-1 ring-ink/10"
            )}
          >
            <SkeletonReveal
              loading={!p.url}
              skeleton={<Skeleton className="aspect-square w-full rounded-none" animate={p.status === "generating"} />}
            >
              {p.url && (
                // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
              )}
            </SkeletonReveal>
            <span className="flex min-h-12 items-center px-3 py-2 text-sm font-semibold text-ink">{t(`style.${p.style}`)}</span>
            {p.style === recommended && (
              <span className="absolute top-2 left-2 rounded-full bg-brand-teal px-2 py-0.5 text-xs font-semibold text-white">{t("style.recommended")}</span>
            )}
          </button>
        ))}
      </div>
      {bookExists && selected !== chosenStyle && <Notice tone="warn">{t("hero.style_change.warning", undefined, heroCtx)}</Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        <Button
          className="w-full sm:w-auto"
          disabled={!selected}
          pending={pending}
          onClick={() =>
            start(async () => {
              const result = await chooseStyleAction(projectId!, selected!);
              if (!result.ok) return setError(result.error);
              router.replace(stepHref(market, projectId!, 3));
              router.refresh();
            })
          }
        >
          {t("style.choose")}
        </Button>
      </StepFooter>
    </>
  );
}

function HeroCard({
  heroId,
  card,
  approved,
  retriesLeft,
  appearance,
  manualRequested,
}: Parameters<typeof StyleStep>[0] & { card: CardView }) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "edit" | "retry">("none");
  const [look, setLook] = useState<Appearance>(appearance);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const heroCtx = hero ?? undefined;
  const busy = card.status === "generating";

  const run = (action: () => Promise<{ ok: boolean; error?: MessageKey }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) return setError(result.error ?? "error.generic");
      after?.();
      router.refresh();
    });

  const exhausted = retriesLeft <= 0;
  useSubStep(panel === "edit" ? t("hero.edit") : panel === "retry" ? t("hero.retry") : null);

  return (
    <>
      <StepTitle title={t("hero.title", undefined, heroCtx)} subtitle={t("hero.subtitle")} />

      {panel === "none" && (
      <section aria-busy={busy} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardImage loading={busy} src={card.portrait} alt={t("configurator.card.portrait")} className="col-span-2 aspect-square sm:col-span-1 lg:col-span-1 lg:aspect-[4/5]" />
        <CardImage loading={busy} src={card.fullBody} alt={t("configurator.card.full_body")} className="aspect-[2/3] sm:row-span-2 lg:row-span-1 lg:aspect-[4/5]" />
        <CardImage loading={busy} src={card.smile} alt={t("configurator.card.smile")} className="aspect-square lg:aspect-[4/5]" />
        <CardImage loading={busy} src={card.surprise} alt={t("configurator.card.surprise")} className="aspect-square lg:aspect-[4/5]" />
      </section>
      )}
      {busy && (
        <p className="text-sm text-ink/70" aria-live="polite">
          {t("hero.updating")}
        </p>
      )}

      {manualRequested && <Notice>{t("configurator.hero.manual_requested")}</Notice>}

      {panel === "edit" && (
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
          <h2 className="font-semibold">{t("hero.edit")}</h2>
          <AppearancePicker
            value={look}
            onChange={setLook}
            choices={["hairColor", "hairLength", "hairstyle", "eyes", "skin", "outfitColor", "accessory"]}
            flags={["glasses", "freckles", "braces", "hearingAid", "wheelchair"]}
          />
          <div className="flex flex-wrap gap-2">
            <Button pending={pending} onClick={() => run(() => updateAppearanceAction(projectId!, heroId, look), () => setPanel("none"))}>
              {t("common.done")}
            </Button>
            <Button variant="ghost" onClick={() => setPanel("none")}>
              {t("common.back")}
            </Button>
          </div>
        </section>
      )}

      {panel === "retry" && !exhausted && (
        <fieldset className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
          <legend className="px-1 font-semibold">{t("hero.retry.reason.title")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {t(`hero.retry.reason.${r}`)}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-ink/70">{t("hero.retry.counter", { n: retriesLeft })}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!reason} pending={pending} onClick={() => run(() => retryCardAction(projectId!, reason!), () => setPanel("none"))}>
              {t("hero.retry")}
            </Button>
            <Button variant="ghost" onClick={() => setPanel("none")}>
              {t("common.back")}
            </Button>
          </div>
        </fieldset>
      )}

      {exhausted && !approved && (
        <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
          <h2 className="font-heading text-xl font-extrabold">{t("hero.exhausted.title")}</h2>
          <p className="text-sm text-ink/75">{t("hero.exhausted.body")}</p>
          <Link href={stepHref(market, projectId!, 2)} className={buttonClass("secondary")}>
            {t("hero.exhausted.other_photo")}
          </Link>
          <Link href={`${stepHref(market, projectId!, 2)}?opis=1`} className={buttonClass("secondary")}>
            {t("hero.exhausted.describe")}
          </Link>
          <Button variant="secondary" disabled={manualRequested} pending={pending} onClick={() => run(() => requestManualHeroAction(projectId!))}>
            {t("hero.exhausted.human")}
          </Button>
        </section>
      )}

      {panel === "none" && (
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPanel("edit")} disabled={busy}>
          {t("hero.edit")}
        </Button>
        {!exhausted && (
          <Button variant="secondary" onClick={() => setPanel("retry")} disabled={busy}>
            {t("hero.retry")}
          </Button>
        )}
        <Link href={`${stepHref(market, projectId!, 3)}?zmena=1`} className={buttonClass("ghost")}>
          {t("configurator.style.change")}
        </Link>
      </div>
      )}
      {error && <Notice tone="error">{t(error)}</Notice>}

      {panel === "none" && (
      <StepFooter>
        <Button
          className="w-full sm:w-auto"
          disabled={busy || card.status === "failed"}
          pending={pending}
          onClick={() =>
            approved
              ? router.push(stepHref(market, projectId!, 4))
              : start(async () => {
                  const result = await approveHeroAction(projectId!);
                  if (!result.ok) return setError(result.error);
                  // Potvrdenie „Podoba schválená…“ ukáže krok 4.
                  router.push(`${stepHref(market, projectId!, 4)}?schvalene=1`);
                })
          }
        >
          {approved ? t("common.continue") : t("hero.approve")}
        </Button>
      </StepFooter>
      )}
    </>
  );
}

/** Obrázok Karty – kým sa kreslí, kosť v rovnakom tvare; potom sa odhalí zotretím. */
function CardImage({ src, alt, className, loading }: { src: string | null; alt: string; className?: string; loading: boolean }) {
  return (
    <SkeletonReveal
      className={className}
      loading={loading || !src}
      skeleton={<Skeleton className="h-full w-full rounded-3xl" animate={loading} />}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
        <img src={src} alt={alt} className="h-full w-full rounded-3xl bg-white object-cover ring-1 ring-ink/10" />
      )}
    </SkeletonReveal>
  );
}
