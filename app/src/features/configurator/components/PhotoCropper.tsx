"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";
import { Button } from "./ui";

/*
  Orez a otočenie fotky priamo v prehliadači (K2.1). Fotka neodchádza
  nikam, kým ju zákazník nepotvrdí; na server ide už orezaný JPEG.
  Rámik 4:5 – tvár a ramená, ako pri portréte.
*/

const VIEW_W = 280;
const VIEW_H = 350;
const OUT_W = 1200;

type Props = {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob, size: { width: number; height: number }) => void;
};

export function PhotoCropper({ file, onCancel, onDone }: Props) {
  const { t } = useI18n();
  const ids = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    dialogRef.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Vykreslenie do plátna s rovnakou transformáciou pre náhľad aj výstup.
  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, img: HTMLImageElement) {
    const rotated = rotation % 180 !== 0;
    const iw = rotated ? img.naturalHeight : img.naturalWidth;
    const ih = rotated ? img.naturalWidth : img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const k = w / VIEW_W;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + offset.x * k, h / 2 + offset.y * k);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, (-img.naturalWidth * scale) / 2, (-img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.restore();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && image) draw(ctx, canvas.width, canvas.height, image);
  });

  function confirm() {
    if (!image) return;
    const rotated = rotation % 180 !== 0;
    const source = Math.max(VIEW_W / (rotated ? image.naturalHeight : image.naturalWidth), VIEW_H / (rotated ? image.naturalWidth : image.naturalHeight)) * zoom;
    // Výstup nemá byť väčší, ako dovoľuje pôvodné rozlíšenie orezu.
    const width = Math.round(Math.min(OUT_W, VIEW_W / source));
    const height = Math.round((width * VIEW_H) / VIEW_W);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx, width, height, image);
    canvas.toBlob((blob) => blob && onDone(blob, { width, height }), "image/jpeg", 0.9);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-labelledby={`${ids}-title`}
      className="m-auto w-[min(100vw-1rem,26rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60"
    >
      <div className="flex flex-col items-center gap-4 p-5">
        <h2 id={`${ids}-title`} className="self-start font-heading text-xl font-extrabold">
          {t("configurator.crop.title")}
        </h2>
        <canvas
          ref={canvasRef}
          width={VIEW_W * 2}
          height={VIEW_H * 2}
          style={{ width: VIEW_W, height: VIEW_H }}
          className="touch-none cursor-grab rounded-2xl ring-1 ring-ink/10"
          aria-label={t("configurator.crop.drag")}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
          }}
          onPointerMove={(e) => drag.current && setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })}
          onPointerUp={() => (drag.current = null)}
        />
        <label className="flex w-full items-center gap-3 text-sm font-medium" htmlFor={`${ids}-zoom`}>
          {t("configurator.crop.zoom")}
          <input
            id={`${ids}-zoom`}
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-12 flex-1 accent-brand-orange-dark"
          />
        </label>
        <div className="flex w-full flex-col gap-2">
          <Button variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>
            ↻ {t("configurator.crop.rotate")}
          </Button>
          <Button onClick={confirm} disabled={!image}>
            {t("configurator.crop.use")}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** Prehliadač vie fotku zobraziť (HEIC mimo Safari nie) – inak sa nahrá bez orezu. */
export function canDecode(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}
