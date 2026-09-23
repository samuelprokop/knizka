import type { LayoutId } from "@/config/catalog";
import { THEME_COLORS, type LookOptions } from "../model";
import { cx } from "./ui";

/*
  ZÁSTUPNÝ náhľad dvojstrany pre krok 6 a náhľad knihy (krok 8). Skutočnú
  sadzbu (mriežky, textové rámy, limity znakov, písma) dodá balík C –
  potom sa tu len vymení komponent, rozhranie (layout, vzhľad, text, obrázok)
  ostáva.
*/

const FONT_CLASS: Record<LookOptions["font"], string> = {
  classic: "font-heading",
  rounded: "font-body",
  handwritten: "font-heading italic",
  large: "font-body text-[1.15em]",
};

export function SampleSpread({
  layout,
  look,
  text,
  image,
  imageAlt,
  pending,
}: {
  layout: LayoutId;
  look: Pick<LookOptions, "theme" | "font" | "frames">;
  text: string;
  image: string | null;
  imageAlt: string;
  pending?: boolean;
}) {
  const [accent, paper] = THEME_COLORS[look.theme];
  const font = FONT_CLASS[look.font];
  const frame = look.frames ? { boxShadow: `inset 0 0 0 6px ${accent}33` } : undefined;

  const img = image ? (
    // eslint-disable-next-line @next/next/no-img-element -- súkromný súbor projektu
    <img src={image} alt={imageAlt} className="h-full w-full object-cover" />
  ) : (
    <span aria-hidden className={cx("block h-full w-full", pending && "animate-pulse")} style={{ backgroundColor: `${accent}22` }} />
  );

  if (layout === "panoramic") {
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl shadow-md" style={{ backgroundColor: paper, ...frame }}>
        {img}
        <p className={cx("absolute top-3 left-3 max-w-[45%] rounded-xl bg-white/85 p-3 text-[clamp(0.6rem,2.4vw,0.95rem)] leading-snug text-ink", font)}>{text}</p>
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-ink/10" />
      </div>
    );
  }

  const textSize =
    layout === "first_reading" ? "text-[clamp(0.8rem,3.2vw,1.3rem)] leading-relaxed" : layout === "picture" ? "text-[clamp(0.55rem,2.1vw,0.85rem)]" : "text-[clamp(0.6rem,2.4vw,0.95rem)] leading-snug";

  return (
    <div className="grid aspect-[2/1] w-full grid-cols-2 overflow-hidden rounded-2xl shadow-md" style={{ backgroundColor: paper, ...frame }}>
      <div className={cx("overflow-hidden", layout === "first_reading" && "p-4")}>{img}</div>
      <div className={cx("relative flex border-l border-ink/10 p-[6%]", layout === "picture" ? "items-end" : "items-center")}>
        {layout === "picture" && <div className="absolute inset-0 -z-0 opacity-60">{img}</div>}
        <p className={cx("relative text-ink", textSize, font, layout === "picture" && "rounded-lg bg-white/85 p-2")} style={{ color: layout === "first_reading" ? "#17140f" : undefined }}>
          {text}
        </p>
      </div>
    </div>
  );
}
