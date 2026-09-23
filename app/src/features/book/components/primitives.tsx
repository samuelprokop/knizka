/*
  Drobné stavebné prvky strán. Bez hookov stavu a bez serverových importov –
  používajú sa v klientskom náhľade aj v statickom HTML pre PDF.
*/

import QRCode from "qrcode";
import { useId, type CSSProperties } from "react";

import type { LayoutId } from "@/config/catalog";
import { FONT_PAIR_SPECS, FORMAT_SPECS, LAYOUT_SPECS, THEME_SPECS, type EndpaperId } from "../design";
import type { BookImage, BookOptions, CountIcon } from "../model/types";

/** CSS premenné témy, písma a rozmeru strany – nastavujú sa na koreň knihy alebo dvojstrany. */
export function bookCssVars(options: Pick<BookOptions, "format" | "theme" | "fontPair">): CSSProperties {
  const format = FORMAT_SPECS[options.format];
  const theme = THEME_SPECS[options.theme];
  const fonts = FONT_PAIR_SPECS[options.fontPair];
  return {
    "--page-w": format.widthMm,
    "--page-h": format.heightMm,
    "--bk-paper": theme.paper,
    "--bk-ink": theme.ink,
    "--bk-accent": theme.accent,
    "--bk-soft": theme.soft,
    "--bk-on-accent": theme.onAccent,
    "--bk-heading": fonts.heading,
    "--bk-heading-weight": fonts.headingWeight,
    "--bk-body": fonts.body,
    "--bk-body-weight": fonts.bodyWeight,
  } as CSSProperties;
}

export function layoutCssVars(layout: LayoutId): CSSProperties {
  const spec = LAYOUT_SPECS[layout];
  return { "--bk-text-size": spec.fontSizeMm, "--bk-line-height": spec.lineHeight } as CSSProperties;
}

/** Jemný vodoznak cez ilustráciu (K8.1) – text ostáva čitateľný, lebo je len nad obrázkom. */
export function Watermark({ text }: { text: string }) {
  const id = useId();
  return (
    <svg className="bk-watermark" aria-hidden="true">
      <defs>
        <pattern id={id} width="170" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <text
            x="0"
            y="50"
            fill="#ffffff"
            fillOpacity="0.55"
            stroke="#000000"
            strokeOpacity="0.12"
            strokeWidth="0.6"
            style={{ font: "700 22px sans-serif", letterSpacing: "0.18em" }}
          >
            {text}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function Illustration({
  image,
  alt,
  missingLabel,
  watermark,
  className = "bk-img",
  style,
}: {
  image: BookImage | null;
  alt: string;
  missingLabel: string;
  watermark?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!image?.src) {
    return <div className="bk-placeholder">{missingLabel}</div>;
  }
  return (
    <>
      {/* Obrázky idú cez podpísané URL alebo zo súboru v PDF – next/image tu nepomôže. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={className} src={image.src} alt={alt} style={style} decoding="async" draggable={false} />
      {watermark && <Watermark text={watermark} />}
    </>
  );
}

export function Ornament() {
  return (
    <svg className="bk-ornament" viewBox="0 0 104 20" aria-hidden="true">
      <path
        d="M2 10c10-8 18-8 26 0s16 8 24 0 16-8 24 0 16 8 26 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="52" cy="10" r="3.4" fill="currentColor" />
    </svg>
  );
}

const PATTERN_TILES: Record<Exclude<EndpaperId, "solid">, (color: string) => React.ReactNode> = {
  dots: (c) => <circle cx="9" cy="9" r="2.2" fill={c} />,
  stars: (c) => (
    <path d="M9 3.5l1.6 3.4 3.7.4-2.8 2.5.8 3.7L9 11.6l-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill={c} />
  ),
  waves: (c) => <path d="M0 9c3-3 6-3 9 0s6 3 9 0" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />,
  leaves: (c) => <ellipse cx="9" cy="9" rx="2" ry="4.4" transform="rotate(35 9 9)" fill={c} />,
  hearts: (c) => (
    <path d="M9 13.5s-4.8-3-4.8-6.1A2.6 2.6 0 0 1 9 6.3a2.6 2.6 0 0 1 4.8 1.1C13.8 10.5 9 13.5 9 13.5z" fill={c} />
  ),
};

/** Vzor predsádky; farbu berie z --bk-accent cez currentColor. */
export function EndpaperPattern({ pattern }: { pattern: EndpaperId }) {
  const id = useId();
  if (pattern === "solid") return null;
  return (
    <svg aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 210 297">
      <defs>
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <g opacity="0.55">{PATTERN_TILES[pattern]("currentColor")}</g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** QR kód ako vektor (tlač bez rozmazania). Generuje sa synchrónne, funguje v prehliadači aj na serveri. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = modules.size;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(y, x)) path += `M${x + 2} ${y + 2}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`0 0 ${size + 4} ${size + 4}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

const ICON_PATHS: Record<CountIcon, React.ReactNode> = {
  star: <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" />,
  apple: (
    <>
      <path d="M12 7c-1.7-1.3-6-1.6-7 2.7-.9 4 1.9 10.3 4.8 10.3 1 0 1.4-.6 2.2-.6s1.2.6 2.2.6c2.9 0 5.7-6.3 4.8-10.3-1-4.3-5.3-4-7-2.7z" />
      <path d="M12 7c0-2 1-3.6 3-4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 10.5c5 2 12 2 17 0M12 3c-3 5-3 13 0 18" fill="none" stroke="#fff" strokeWidth="1.3" />
    </>
  ),
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="12" cy="6.5" rx="3.2" ry="4.6" transform={`rotate(${r} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3" fill="#fff" />
    </>
  ),
  fish: (
    <>
      <path d="M3 12c3.5-5 10-6.5 14.5 0-4.5 6.5-11 5-14.5 0z" />
      <path d="M17 12l4.5-4v8z" />
      <circle cx="7.5" cy="11" r="1.1" fill="#fff" />
    </>
  ),
  heart: <path d="M12 20.5S3 15 3 8.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 9 2.2C21 15 12 20.5 12 20.5z" />,
};

export function CountIconSvg({ icon }: { icon: CountIcon }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICON_PATHS[icon]}
    </svg>
  );
}
