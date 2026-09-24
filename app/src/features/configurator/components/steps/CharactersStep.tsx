"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import { CHARACTER_KINDS, GUIDE_ANIMALS, MAX_EXTRA_CHARACTERS, type CharacterKind, type GuideKind } from "@/config/catalog";
import { Skeleton, SkeletonReveal } from "@/components/Skeleton";
import { useI18n } from "@/i18n/client";
import { createTranslator } from "@/i18n/format";
import type { BookLanguage } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/messages";
import type { Gender } from "@/lib/language";
import { lookupNameAction } from "../../actions/child";
import {
  addCompanionAction,
  approveCompanionAction,
  generateCompanionCardAction,
  onlyHeroAction,
  removeCompanionAction,
  setGuideAction,
} from "../../actions/characters";
import { MASCOT_NAME, type Appearance } from "../../model";
import type { NameLookup } from "../../server/names";
import { stepHref } from "../../steps";
import { validateChildName } from "../../validation";
import { AppearancePicker } from "../AppearancePicker";
import { AutoRefresh } from "../AutoRefresh";
import { PhotoUploader, type PhotoView } from "../PhotoUploader";
import { StepFooter } from "../StepFooter";
import { Button, Check, Chip, Field, Notice, StepTitle, inputClass, splitOptions } from "../ui";
import { useWizard } from "../WizardContext";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { ToastOnMount } from "@/components/Toaster";

export type CompanionView = {
  id: string;
  kind: string;
  name: string;
  storyRole: string | null;
  card: { status: string; url: string | null; approved: boolean } | null;
  photos: PhotoView[];
  withPhoto: boolean;
};

export type GuideView = { kind: GuideKind; animal: string | null; name: string | null };

const IMPLIED_GENDER: Partial<Record<CharacterKind, Gender>> = { mother: "girl", grandmother: "girl", father: "boy", grandfather: "boy" };

export function CharactersStep({
  companions,
  guide,
  decided,
  extraPrice,
  justApproved,
}: {
  companions: CompanionView[];
  guide: GuideView;
  decided: boolean;
  extraPrice: string;
  justApproved: boolean;
}) {
  const { t } = useI18n();
  const { market, projectId, hero } = useWizard();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const heroCtx = hero ?? undefined;
  const generating = companions.some((c) => c.card?.status === "generating");

  const next = () =>
    start(async () => {
      const result = await onlyHeroAction(projectId!);
      if (!result.ok) return setError(result.error);
      router.push(stepHref(market, projectId!, 5));
    });

  const refresh = (action: () => Promise<{ ok: boolean; error?: MessageKey }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error ?? "error.generic");
      router.refresh();
    });

  return (
    <>
      <AutoRefresh active={generating} />
      {justApproved && <ToastOnMount title={t("hero.approved.toast")} tone="ok" />}
      <StepTitle title={t("chars.title")} />

      {!decided && companions.length === 0 && !adding && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button onClick={next} pending={pending}>
            {t("chars.only_hero", undefined, heroCtx)}
          </Button>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t("chars.add")}
          </Button>
        </div>
      )}

      {companions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {companions.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
              <div className="flex items-center gap-3">
                <SkeletonReveal
                  className="size-16 shrink-0"
                  loading={!c.card?.url}
                  skeleton={<Skeleton className="size-16 rounded-2xl" animate={c.card?.status === "generating"} />}
                >
                  {c.card?.url && (
                    // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
                    <img src={c.card.url} alt="" className="size-16 rounded-2xl object-cover" />
                  )}
                </SkeletonReveal>
                <div className="flex flex-1 flex-col">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-sm text-ink/65">
                    {splitOptions(t("chars.type.options"))[CHARACTER_KINDS.indexOf(c.kind as CharacterKind)]}
                    {c.storyRole && ` · ${t(c.storyRole === "companion" ? "chars.role.companion" : "chars.role.cameo")}`}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => refresh(() => removeCompanionAction(projectId!, c.id))} aria-label={t("configurator.chars.remove", { name: c.name })} className="min-w-12 px-0">
                  <CloseIcon />
                </Button>
              </div>

              {c.withPhoto && !c.card && (
                <>
                  <PhotoUploader characterId={c.id} photos={c.photos} />
                  <Button variant="secondary" disabled={!c.photos.some((p) => p.verdict !== "bad")} onClick={() => refresh(() => generateCompanionCardAction(projectId!, c.id))}>
                    {t("configurator.chars.create_card")}
                  </Button>
                </>
              )}
              {c.card?.status === "generating" && <p className="text-sm text-ink/70">{t("hero.updating")}</p>}
              {c.card?.status === "ready" && !c.card.approved && (
                <Button variant="secondary" onClick={() => refresh(() => approveCompanionAction(projectId!, c.id))}>
                  {t("configurator.chars.approve_card", { name: c.name })}
                </Button>
              )}
              {c.card?.approved && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-[#1f7a3a]">
                  <CheckIcon className="size-4" />
                  {t("configurator.chars.card_approved")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(adding || companions.length > 0) && companions.length < MAX_EXTRA_CHARACTERS && (
        adding ? (
          <CompanionForm
            extraPrice={extraPrice}
            onCancel={() => setAdding(false)}
            onAdded={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <PlusIcon />
            {t("chars.add")}
          </Button>
        )
      )}
      {companions.length >= MAX_EXTRA_CHARACTERS && <Notice>{t("chars.limit")}</Notice>}

      {(decided || companions.length > 0 || adding) && <GuidePicker guide={guide} />}

      {error && <Notice tone="error">{t(error)}</Notice>}
      {(decided || companions.length > 0) && (
        <StepFooter>
          <Button className="w-full sm:w-auto" pending={pending} disabled={generating} onClick={next}>
            {t("common.continue")}
          </Button>
        </StepFooter>
      )}
      {!decided && companions.length === 0 && <StepFooter />}
    </>
  );
}

function CompanionForm({ extraPrice, onCancel, onAdded }: { extraPrice: string; onCancel: () => void; onAdded: () => void }) {
  const { t } = useI18n();
  const { projectId, bookLanguage } = useWizard();
  const ids = useId();
  const [kind, setKind] = useState<CharacterKind | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [role, setRole] = useState<"companion" | "cameo">("companion");
  const [withPhoto, setWithPhoto] = useState(false);
  const [consent, setConsent] = useState(false);
  const [look, setLook] = useState<Appearance>({});
  const [lookup, setLookup] = useState<NameLookup | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  const kinds = splitOptions(t("chars.type.options"));
  const effectiveGender = (kind && IMPLIED_GENDER[kind]) ?? gender;
  const nameError = validateChildName(name);
  const bookT = useMemo(() => createTranslator(bookLanguage as BookLanguage), [bookLanguage]);

  useEffect(() => {
    if (nameError) return;
    const handle = setTimeout(async () => setLookup(await lookupNameAction(name, bookLanguage, effectiveGender ?? undefined)), 300);
    return () => clearTimeout(handle);
  }, [name, bookLanguage, effectiveGender, nameError]);

  const ready = kind && !nameError && effectiveGender && (!withPhoto || consent);

  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">{t("chars.type.label")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {CHARACTER_KINDS.map((k, i) => (
            <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
              {kinds[i]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {kind === "pet" && (
        <Field label={t("chars.pet.kind")} htmlFor={`${ids}-pet`}>
          <input id={`${ids}-pet`} className={inputClass} maxLength={30} value={look.petKind ?? ""} onChange={(e) => setLook({ ...look, petKind: e.target.value })} />
        </Field>
      )}

      <Field label={t("chars.name.label")} htmlFor={`${ids}-name`} error={name && nameError ? t(nameError) : undefined}>
        <input id={`${ids}-name`} className={inputClass} maxLength={30} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>

      {kind && !IMPLIED_GENDER[kind] && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("configurator.chars.gender")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["girl", "boy"] as const).map((g) => (
              <Chip key={g} selected={gender === g} onClick={() => setGender(g)} className="text-center">
                {t(kind === "pet" ? `configurator.chars.pet_gender.${g}` : `configurator.chars.gender.${g}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {lookup && effectiveGender && (
        <p className="font-heading text-lg" lang={bookLanguage}>
          „{bookT("child.check.sample3", undefined, { forms: lookup.forms, gender: effectiveGender, declinable: lookup.declinable })}“
        </p>
      )}

      {kind !== "pet" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{t("configurator.chars.look")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {splitOptions(t("chars.photo_or_describe")).map((label, i) => (
              <Chip key={label} selected={withPhoto === (i === 0)} onClick={() => setWithPhoto(i === 0)} className="text-center">
                {label}
              </Chip>
            ))}
          </div>
          {kind === "friend" && <p className="text-sm text-ink/65">{t("chars.friend_hint")}</p>}
          {withPhoto ? (
            <Check id={`${ids}-consent`} checked={consent} onChange={setConsent}>
              {t("chars.consent.other_person")}
            </Check>
          ) : (
            <AppearancePicker value={look} onChange={setLook} choices={["hairColor", "hairLength", "skin"]} flags={["glasses"]} />
          )}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">{t("chars.role.label")}</legend>
        {(["companion", "cameo"] as const).map((r) => (
          <Chip key={r} selected={role === r} onClick={() => setRole(r)}>
            {t(`chars.role.${r}`)}
          </Chip>
        ))}
      </fieldset>

      <p className="text-sm text-ink/70">{t("chars.price_hint", { price: extraPrice })}</p>
      {error && <Notice tone="error">{t(error)}</Notice>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          disabled={!ready}
          pending={pending}
          onClick={() =>
            start(async () => {
              const result = await addCompanionAction(projectId!, {
                kind,
                name,
                gender: effectiveGender,
                storyRole: role,
                appearance: look,
                editedForms: null,
                indeclinable: false,
                otherPersonConsent: consent,
                withPhoto: withPhoto && kind !== "pet",
              });
              if (!result.ok) return setError(result.error);
              onAdded();
            })
          }
        >
          {t("configurator.chars.add_confirm")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </section>
  );
}

function GuidePicker({ guide }: { guide: GuideView }) {
  const { t } = useI18n();
  const { projectId, hero } = useWizard();
  const router = useRouter();
  const ids = useId();
  const [kind, setKind] = useState<GuideKind>(guide.kind);
  const [animal, setAnimal] = useState<string>(guide.animal ?? GUIDE_ANIMALS[0]);
  const [name, setName] = useState(guide.name ?? "");
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();
  const animals = splitOptions(t("guide.animal.options"));

  const save = (next: GuideKind) =>
    start(async () => {
      const input = next === "animal" ? { kind: next, animal, name, gender: "boy" } : { kind: next };
      const result = await setGuideAction(projectId!, input);
      if (!result.ok) return setError(result.error);
      setError(null);
      setSaved(true);
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-extrabold">{t("guide.title", undefined, hero ?? undefined)}</h2>
      <div className="flex flex-col gap-2">
        <Chip selected={kind === "mascot"} onClick={() => { setKind("mascot"); save("mascot"); }}>
          {t("guide.mascot", { mascot: MASCOT_NAME })}
        </Chip>
        <Chip selected={kind === "animal"} onClick={() => { setKind("animal"); setSaved(false); }}>
          {t("guide.animal")}
        </Chip>
        <Chip selected={kind === "none"} onClick={() => { setKind("none"); save("none"); }}>
          {t("guide.none")}
        </Chip>
      </div>
      {kind === "none" && <p className="text-sm text-ink/65">{t("guide.none.hint")}</p>}
      {kind === "animal" && (
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink/10">
          <div className="grid grid-cols-3 gap-2">
            {GUIDE_ANIMALS.map((a, i) => (
              <Chip key={a} selected={animal === a} onClick={() => { setAnimal(a); setSaved(false); }} className="text-center">
                {animals[i]}
              </Chip>
            ))}
          </div>
          <Field label={t("guide.animal.name")} htmlFor={`${ids}-guide`}>
            <input id={`${ids}-guide`} className={inputClass} maxLength={30} value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          </Field>
          <Button variant="secondary" disabled={saved || !!validateChildName(name)} pending={pending} onClick={() => save("animal")}>
            {t("common.done")}
          </Button>
        </div>
      )}
      {error && <Notice tone="error">{t(error)}</Notice>}
    </section>
  );
}
