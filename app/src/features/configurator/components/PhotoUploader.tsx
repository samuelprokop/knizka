"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { LIMITS } from "@/config/catalog";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { removePhotoAction } from "../actions/hero";
import type { PhotoVerdict } from "../server/photo-check";
import { canDecode, PhotoCropper } from "./PhotoCropper";
import { buttonClass, cx, Notice } from "./ui";
import { fileUrl } from "../files";
import { useWizard } from "./WizardContext";
import { AlertIcon, CameraIcon, CheckIcon, CloseIcon } from "@/components/icons";

export type PhotoView = { id: string; verdict: string; reason: string | null };

type Phase = { kind: "idle" } | { kind: "uploading" } | { kind: "checking" } | { kind: "verdict"; verdict: PhotoVerdict } | { kind: "error"; key: MessageKey };

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif";

/**
 * Nahratie 1 – 3 fotiek postavy: fotoaparát alebo galéria, orez, otočenie,
 * priebeh, verdikt s radou (K2.1, K2.2). Pred prvým nahratím sa volá
 * `beforeFirstUpload` (uloženie súhlasov).
 */
export function PhotoUploader({
  characterId,
  photos,
  disabled,
  beforeFirstUpload,
}: {
  characterId: string;
  photos: PhotoView[];
  disabled?: boolean;
  beforeFirstUpload?: () => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { market, projectId } = useWizard();
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [removing, startRemove] = useTransition();

  const usable = photos.filter((p) => p.verdict === "good" || p.verdict === "ok");
  const full = photos.length >= LIMITS.photosPerCharacter;

  async function upload(blob: Blob, name: string, size?: { width: number; height: number }) {
    if (!projectId) return;
    if (beforeFirstUpload && !(await beforeFirstUpload())) return setPhase({ kind: "error", key: "error.generic" });
    setPhase({ kind: "uploading" });
    const body = new FormData();
    body.set("file", blob, name);
    body.set("characterId", characterId);
    if (size) {
      body.set("width", String(size.width));
      body.set("height", String(size.height));
    }
    try {
      const request = fetch(`/${market}/kniha/${projectId}/nahrat`, { method: "POST", body });
      setTimeout(() => setPhase((p) => (p.kind === "uploading" ? { kind: "checking" } : p)), 400);
      const response = await request;
      const result = (await response.json()) as { ok: boolean; error?: MessageKey; verdict?: PhotoVerdict };
      if (!result.ok || !result.verdict) return setPhase({ kind: "error", key: result.error ?? "error.upload_failed" });
      setPhase({ kind: "verdict", verdict: result.verdict });
      router.refresh();
    } catch {
      setPhase({ kind: "error", key: navigator.onLine ? "error.upload_failed" : "error.offline" });
    }
  }

  async function onPick(picked: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!picked) return;
    // HEIC, ktorý prehliadač nevie zobraziť, ide bez orezu – server ho prijme.
    if (await canDecode(picked)) setFile(picked);
    else await upload(picked, picked.name);
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- súkromný súbor, nie cez optimalizátor */}
              <img
                src={fileUrl(market, projectId!, "foto", photo.id)}
                alt={t("configurator.photo.thumb")}
                className="aspect-[4/5] w-full rounded-2xl bg-white object-cover ring-1 ring-ink/10"
              />
              <span
                className={cx(
                  "absolute top-2 left-2 flex size-7 items-center justify-center rounded-full",
                  photo.verdict === "good" ? "bg-[#1f7a3a] text-white" : "bg-[#fff1d6] text-ink"
                )}
              >
                {photo.verdict === "good" ? <CheckIcon className="size-4" /> : <AlertIcon className="size-4" />}
                <span className="sr-only">{photo.verdict === "good" ? t("photo.verdict.good") : t("configurator.photo.usable")}</span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemove(async () => {
                  await removePhotoAction(projectId!, photo.id);
                  setPhase({ kind: "idle" });
                  router.refresh();
                })}
                aria-label={t("configurator.photo.remove")}
                className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
              >
                <CloseIcon className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite" className="flex flex-col gap-2">
        {phase.kind === "uploading" && <Notice>{t("photo.uploading")}</Notice>}
        {phase.kind === "checking" && <Notice>{t("photo.checking")}</Notice>}
        {phase.kind === "error" && <Notice tone="error">{t(phase.key)}</Notice>}
        {phase.kind === "verdict" && <VerdictNotice verdict={phase.verdict} />}
      </div>

      {!full && (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="hidden"
            tabIndex={-1}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={buttonClass(usable.length ? "secondary" : "primary", "w-full")}
          >
            <CameraIcon /> {usable.length ? t("photo.add_more") : t("photo.upload")}
          </button>
        </>
      )}

      {file && (
        <PhotoCropper
          file={file}
          onCancel={() => setFile(null)}
          onDone={(blob, size) => {
            setFile(null);
            upload(blob, "photo.jpg", size);
          }}
        />
      )}
    </div>
  );
}

function VerdictNotice({ verdict }: { verdict: PhotoVerdict }) {
  const { t } = useI18n();
  if (verdict.verdict === "good") return <Notice tone="ok">{t("photo.verdict.good")}</Notice>;
  if (verdict.verdict === "ok") return <Notice tone="warn">{t("photo.verdict.ok", { advice: t(`photo.advice.${verdict.advice}`) })}</Notice>;
  if (verdict.verdict === "bad") return <Notice tone="error">{t("photo.verdict.bad", { reason: t(`photo.reason.${verdict.reason}`) })}</Notice>;
  return <Notice tone="error">{t("photo.rejected_content")}</Notice>;
}

