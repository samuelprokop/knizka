"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { finishPhotoStepAction, saveDescriptionAction, savePhotoConsentsAction } from "../../actions/hero";
import type { Appearance } from "../../model";
import { stepHref } from "../../steps";
import { AppearancePicker } from "../AppearancePicker";
import { PhotoUploader, type PhotoView } from "../PhotoUploader";
import { StepFooter } from "../StepFooter";
import { Button, Check, Disclosure, Notice, StepTitle } from "../ui";
import { useWizard } from "../WizardContext";
import { BanIcon, SmileIcon } from "@/components/icons";

const CONSENTS = ["photo.consent.guardian", "photo.consent.ai", "photo.consent.retention"] as const satisfies readonly MessageKey[];

export function PhotoStep({
  heroId,
  photos,
  consentsGiven,
  initialMode,
  appearance,
}: {
  heroId: string;
  photos: PhotoView[];
  consentsGiven: boolean;
  initialMode: "photo" | "description";
  appearance: Appearance;
}) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [mode, setMode] = useState(initialMode);
  const [checks, setChecks] = useState([consentsGiven, consentsGiven, consentsGiven]);
  const [consentsSaved, setConsentsSaved] = useState(consentsGiven);
  const [look, setLook] = useState<Appearance>(appearance);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  const allChecked = checks.every(Boolean);
  const usable = photos.some((p) => p.verdict === "good" || p.verdict === "ok");
  const heroCtx = hero ?? undefined;

  function continueWith(source: "photo" | "description") {
    start(async () => {
      if (source === "description") {
        const saved = await saveDescriptionAction(projectId!, look);
        if (!saved.ok) return setError(saved.error);
      }
      const result = await finishPhotoStepAction(projectId!, source);
      if (!result.ok) return setError(result.error);
      router.push(stepHref(market, projectId!, 3));
    });
  }

  if (mode === "description") {
    return (
      <>
        <StepTitle title={t("describe.title", undefined, heroCtx)} />
        <AppearancePicker value={look} onChange={setLook} choices={["hairColor", "hairLength", "hairstyle", "eyes", "skin"]} flags={["glasses", "freckles"]} />
        <Button variant="ghost" className="self-start px-0" onClick={() => setMode("photo")}>
          {t("configurator.photo.back_to_photo")}
        </Button>
        {error && <Notice tone="error">{t(error)}</Notice>}
        <StepFooter>
          <Button className="w-full sm:w-auto" pending={pending} disabled={!look.hairColor || !look.skin} onClick={() => continueWith("description")}>
            {t("common.continue")}
          </Button>
        </StepFooter>
      </>
    );
  }

  return (
    <>
      <StepTitle title={t("photo.title", undefined, heroCtx)} subtitle={t("photo.subtitle")} />

      {/* Od lg dva stĺpce: vľavo rady a súhlasy, vpravo nahratie – všetko na jednej obrazovke. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-2 rounded-2xl bg-[#e3f4e6] p-3.5">
              <SmileIcon className="size-6 text-[#1f7a3a]" />
              <p className="text-ink">{t("photo.tip.good")}</p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-[#fde8e6] p-3.5">
              <BanIcon className="size-6 text-[#b3261e]" />
              <p className="text-ink">{t("photo.tip.bad")}</p>
            </div>
          </div>

          <fieldset className="flex flex-col" disabled={consentsSaved}>
            <legend className="sr-only">{t("configurator.photo.consents")}</legend>
            {CONSENTS.map((key, i) => (
              <Check key={key} id={`${ids}-c${i}`} checked={checks[i]} onChange={(v) => setChecks(checks.map((c, j) => (j === i ? v : c)))}>
                {t(key)}
              </Check>
            ))}
          </fieldset>
          <Disclosure summary={t("photo.consent.link")}>
            <p className="text-sm leading-relaxed text-ink/80">{t("photo.consent.explainer")}</p>
          </Disclosure>
        </div>

        <div className="flex flex-col gap-3">
          <PhotoUploader
            characterId={heroId}
            photos={photos}
            disabled={!allChecked}
            beforeFirstUpload={async () => {
              if (consentsSaved) return true;
              const result = await savePhotoConsentsAction(projectId!);
              if (result.ok) setConsentsSaved(true);
              return result.ok;
            }}
          />
          {!allChecked && <p className="text-sm text-ink/65">{t("configurator.photo.consents_first")}</p>}

          <Button variant="ghost" className="self-center" onClick={() => setMode("description")}>
            {t("photo.no_photo")}
          </Button>
        </div>
      </div>

      {error && <Notice tone="error">{t(error)}</Notice>}
      <StepFooter>
        <Button className="w-full sm:w-auto" pending={pending} disabled={!usable} onClick={() => continueWith("photo")}>
          {t("common.continue")}
        </Button>
      </StepFooter>
    </>
  );
}
