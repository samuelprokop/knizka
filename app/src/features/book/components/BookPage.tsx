/*
  Jedna strana knihy – spoločná pre listovací náhľad, ukážkovú dvojstranu,
  e-knihu aj tlačové PDF. Komponent len vykresľuje hotový model (Book); texty
  sú už dosadené jazykovým modulom.
*/

import type { CSSProperties, ReactNode } from "react";

import { FORMAT_SPECS, HANDWRITING_FONT, FONT_PAIR_SPECS } from "../design";
import { MAZE_WALL } from "../activities/generators";
import type {
  ActivityPart,
  Book,
  BookPart,
  CountData,
  FindLettersData,
  MazeData,
  PageRef,
  StorySpreadPart,
} from "../model/types";
import {
  bookCssVars,
  CountIconSvg,
  EndpaperPattern,
  Illustration,
  layoutCssVars,
  Ornament,
  QrCode,
} from "./primitives";

export type PageRenderOptions = {
  /** Text vodoznaku cez ilustrácie (náhľad pred zaplatením). */
  watermark?: string;
  /** Spadávka v mm – len tlačové PDF. */
  bleedMm?: number;
  /** Texty stavov strany počas generovania (jazyk rozhrania). */
  statusLabels?: { pending: string; needsReview: string };
};

type Ctx = { book: Book; opts: PageRenderOptions };

export function BookPage({ book, page, opts = {} }: { book: Book; page: PageRef; opts?: PageRenderOptions }) {
  const ctx: Ctx = { book, opts };
  const orientation = FORMAT_SPECS[book.options.format].orientation;
  const part = page.type === "interior" ? book.parts[page.page.partIndex] : undefined;
  const style: CSSProperties = {
    ...bookCssVars(book.options),
    ...(part?.kind === "story_spread" ? layoutCssVars(part.layout) : {}),
    ...(opts.bleedMm ? ({ "--bleed": opts.bleedMm } as CSSProperties) : {}),
  };
  const status = page.type === "interior" ? book.status?.[page.page.partIndex] : undefined;

  return (
    <div
      className="bk-page"
      data-orientation={orientation}
      data-bleed={opts.bleedMm ? "true" : undefined}
      data-page={page.type === "interior" ? page.page.number : page.type}
      style={style}
    >
      <div className="bk-in">
        {page.type === "cover" && <CoverFront ctx={ctx} />}
        {page.type === "back_cover" && <BackCover ctx={ctx} />}
        {page.type === "endpaper" && (
          <div className="bk-full bk-endpaper">
            <EndpaperPattern pattern={book.options.endpaper} />
          </div>
        )}
        {page.type === "interior" && part && (
          <InteriorContent ctx={ctx} part={part} number={page.page.number} side={page.page.side} />
        )}
        {status && opts.statusLabels && (
          <div className="bk-pending" role="status">
            {status === "pending" ? opts.statusLabels.pending : opts.statusLabels.needsReview}
          </div>
        )}
      </div>
    </div>
  );
}

function InteriorContent({ ctx, part, number, side }: { ctx: Ctx; part: BookPart; number: number; side?: "left" | "right" }) {
  switch (part.kind) {
    case "story_spread":
      return <StoryHalf ctx={ctx} part={part} side={side ?? "left"} number={number} />;
    case "title":
      return (
        <TextPage ctx={ctx} number={number}>
          <div className="bk-title-page">
            <h1 className="bk-heading">{part.title}</h1>
            <Ornament />
            {part.dedication && <p className="bk-dedication">{part.dedication}</p>}
            {(part.from || part.date) && (
              <p className="bk-small">{[part.from, part.date].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </TextPage>
      );
    case "activity":
      return <ActivityPage ctx={ctx} part={part} number={number} />;
    case "parent_guide":
      return (
        <TextPage ctx={ctx} number={number}>
          <Sheet heading={part.heading}>
            <div className="bk-guide">
              {part.goal && <p style={{ marginBottom: "calc(var(--mm) * 4)" }}>{part.goal}</p>}
              <div className="bk-columns">
                <div>
                  <h3>{part.questionsHeading}</h3>
                  <ol className="bk-list" data-size="small">
                    {part.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3>{part.tipsHeading}</h3>
                  <ol className="bk-list" data-size="small">
                    {part.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </Sheet>
        </TextPage>
      );
    case "parent_letter":
      return (
        <TextPage ctx={ctx} number={number}>
          <Sheet heading={part.heading}>
            <p className="bk-letter bk-fit">{part.text}</p>
          </Sheet>
        </TextPage>
      );
    case "free_draw":
      return (
        <TextPage ctx={ctx} number={number}>
          <Sheet heading={part.heading}>
            <div className="bk-draw-frame" />
          </Sheet>
        </TextPage>
      );
    case "imprint":
      return (
        <TextPage ctx={ctx} number={number} frames={false}>
          <div className="bk-imprint">
            <p className="bk-heading">{part.title}</p>
            {part.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{part.aiNotice}</p>
            <div className="bk-qr">
              <QrCode value={part.qrUrl} label={ctx.book.meta.alt.qr} />
              <p>{part.qrLabel}</p>
            </div>
          </div>
        </TextPage>
      );
  }
}

function TextPage({
  ctx,
  number,
  children,
  frames = ctx.book.options.frames,
}: {
  ctx: Ctx;
  number: number;
  children: ReactNode;
  frames?: boolean;
}) {
  return (
    <>
      <div className="bk-full bk-paper-bg" />
      <div className={frames ? "bk-frame" : undefined} style={{ position: "absolute", inset: 0 }}>
        {children}
      </div>
      <Folio number={number} />
    </>
  );
}

function Folio({ number }: { number: number }) {
  return (
    <span className="bk-folio" data-side={number % 2 === 0 ? "left" : "right"} aria-hidden="true">
      {number}
    </span>
  );
}

function Sheet({ heading, instruction, children }: { heading: string; instruction?: string; children: ReactNode }) {
  return (
    <div className="bk-sheet">
      <div className="bk-sheet-head">
        <h2 className="bk-heading">{heading}</h2>
        {instruction && <p className="bk-instruction">{instruction}</p>}
      </div>
      <div className="bk-sheet-body">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- príbeh

function StoryHalf({ ctx, part, side, number }: { ctx: Ctx; part: StorySpreadPart; side: "left" | "right"; number: number }) {
  const { book, opts } = ctx;
  const alt = book.meta.alt.illustration.replace("{n}", String(part.spread + 1));
  const image = (className?: string) => (
    <Illustration
      image={part.illustration}
      alt={side === "left" ? alt : ""}
      missingLabel={book.meta.alt.missing}
      watermark={opts.watermark}
      className={className}
    />
  );
  const text = (body: string) => <p className="bk-story-text">{body}</p>;

  switch (part.layout) {
    case "classic":
      if (side === "left") return <div className="bk-full">{image()}</div>;
      return (
        <TextPage ctx={ctx} number={number}>
          <div className="bk-classic-text">
            <Ornament />
            <div className="bk-fit">{text(part.text)}</div>
          </div>
        </TextPage>
      );

    case "panoramic": {
      const [h, v] = part.textZone.split("-");
      return (
        <>
          <div className="bk-full">{image(`bk-pano-img bk-pano-${side}`)}</div>
          {h === side && (
            <div className="bk-pano-box bk-fit" data-h={h} data-v={v}>
              {text(part.text)}
            </div>
          )}
        </>
      );
    }

    case "picture": {
      const [first, second] = part.textParts ?? [part.text, ""];
      return (
        <>
          <div className="bk-full bk-paper-bg" />
          <div className="bk-picture-img" data-detail={side === "right" ? "true" : undefined}>
            {image()}
          </div>
          <div className="bk-picture-text">
            <div className="bk-fit">{text(side === "left" ? first : second)}</div>
          </div>
          <Folio number={number} />
        </>
      );
    }

    case "first_reading":
      if (side === "left") {
        return (
          <TextPage ctx={ctx} number={number}>
            <div className="bk-reader-text">
              <div className="bk-fit">{text(part.text)}</div>
            </div>
          </TextPage>
        );
      }
      return (
        <>
          <div className="bk-full bk-paper-bg" />
          <div className="bk-reader-img">{image()}</div>
          <Folio number={number} />
        </>
      );
  }
}

// ---------------------------------------------------------------- obálka

function CoverFront({ ctx }: { ctx: Ctx }) {
  const { book, opts } = ctx;
  const { cover, options } = book;
  const pos = options.titlePosition;
  const img = (image: typeof cover.scene, alt: string) => (
    <Illustration image={image} alt={alt} missingLabel={book.meta.alt.missing} watermark={opts.watermark} />
  );
  const title = (
    <h1 className="bk-cover-title bk-heading" data-pos={pos}>
      <span className="bk-cover-panel" style={{ display: "inline-block" }}>
        {cover.title}
      </span>
    </h1>
  );

  switch (options.cover) {
    case "hero_in_scene":
      return (
        <>
          <div className="bk-full">{img(cover.scene, book.meta.alt.hero)}</div>
          {title}
        </>
      );
    case "hero_big":
      return (
        <>
          <div className="bk-full" style={{ background: "linear-gradient(var(--bk-soft), var(--bk-paper))" }} />
          <div className="bk-cover-hero" data-title={pos}>
            {img(cover.hero ?? cover.portrait, book.meta.alt.hero)}
          </div>
          {title}
        </>
      );
    case "ornament_frame":
      return (
        <>
          <div className="bk-full bk-paper-bg" />
          <div className="bk-cover-ornament" />
          <div className="bk-cover-ornament-img" data-title={pos}>
            {img(cover.scene, book.meta.alt.hero)}
          </div>
          {title}
        </>
      );
    case "minimal":
      return (
        <>
          <div className="bk-full" style={{ background: "var(--bk-accent)" }} />
          <div className="bk-cover-minimal-portrait">{img(cover.portrait ?? cover.hero, book.meta.alt.hero)}</div>
          <h1 className="bk-cover-title bk-heading" data-pos={pos === "top" ? "top" : "bottom"} style={{ color: "var(--bk-on-accent)" }}>
            {cover.title}
          </h1>
        </>
      );
  }
}

function BackCover({ ctx }: { ctx: Ctx }) {
  const { book, opts } = ctx;
  return (
    <>
      <div className="bk-full" style={{ background: "var(--bk-soft)" }} />
      <div className="bk-back">
        {book.back.portrait && (
          <div className="bk-back-portrait">
            <Illustration
              image={book.back.portrait}
              alt={book.meta.alt.hero}
              missingLabel={book.meta.alt.missing}
              watermark={opts.watermark}
            />
          </div>
        )}
        <p className="bk-fit">{book.back.text}</p>
      </div>
      <p className="bk-brand">TAKTIK</p>
    </>
  );
}

// ---------------------------------------------------------------- aktivity

function ActivityPage({ ctx, part, number }: { ctx: Ctx; part: ActivityPart; number: number }) {
  if (part.activity === "diploma") {
    const d = part.data;
    return (
      <TextPage ctx={ctx} number={number} frames={false}>
        <div className="bk-diploma">
          <h2 className="bk-heading">{part.heading}</h2>
          <p className="bk-instruction">{part.instruction}</p>
          <p className="bk-diploma-name">{d.name}</p>
          <p className="bk-instruction">{d.reason}</p>
          <div className="bk-signature">
            <span>{d.date}</span>
            <span>{d.signatureLabel}</span>
          </div>
        </div>
      </TextPage>
    );
  }

  let body: ReactNode = null;
  switch (part.activity) {
    case "trace_name":
      body = <TraceName name={part.data.name} readerFont={FONT_PAIR_SPECS.reader.heading} />;
      break;
    case "find_letters":
      body = <LetterGrid data={part.data} />;
      break;
    case "count":
      body = <Count data={part.data} />;
      break;
    case "maze":
      body = <Maze data={part.data} initial={[...ctx.book.meta.heroName][0] ?? ""} />;
      break;
    case "questions":
      body = (
        <ol className="bk-list">
          {part.data.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      );
      break;
    case "draw":
      body = (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: "calc(var(--mm) * 4)" }}>
          <p className="bk-quote">{part.data.sentence}</p>
          <div style={{ position: "relative", flex: 1 }}>
            <div className="bk-draw-frame" />
          </div>
        </div>
      );
      break;
  }

  return (
    <TextPage ctx={ctx} number={number}>
      <Sheet heading={part.heading} instruction={part.instruction}>
        {body}
      </Sheet>
    </TextPage>
  );
}

function TraceName({ name, readerFont }: { name: string; readerFont: string }) {
  const length = Math.max([...name].length, 3);
  const size = Math.min(30, 184 / (length * 0.6));
  const rowHeight = size * 1.35;
  const rows = [
    { font: readerFont, solid: true },
    { font: readerFont, solid: false },
    { font: HANDWRITING_FONT, solid: false },
  ];
  const height = rows.length * rowHeight + 4;
  return (
    <svg viewBox={`0 0 200 ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {rows.map((row, i) => {
        const base = 2 + i * rowHeight + size * 1.02;
        const guide = (y: number, dashed?: boolean) => (
          <line
            x1="0"
            x2="200"
            y1={y}
            y2={y}
            stroke="var(--bk-accent)"
            strokeOpacity={dashed ? 0.45 : 0.7}
            strokeWidth="0.4"
            strokeDasharray={dashed ? "2 2" : undefined}
          />
        );
        return (
          <g key={i}>
            {guide(base - size * 0.72)}
            {guide(base - size * 0.36, true)}
            {guide(base)}
            <text
              x="6"
              y={base}
              style={{ fontFamily: row.font, fontSize: size, fontWeight: 400 }}
              fill={row.solid ? "var(--bk-ink)" : "#ececec"}
              fillOpacity={row.solid ? 0.3 : 1}
              stroke={row.solid ? "none" : "var(--bk-ink)"}
              strokeWidth={row.solid ? 0 : size * 0.035}
              strokeDasharray={row.solid ? undefined : `${size * 0.01} ${size * 0.09}`}
              strokeLinecap="round"
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LetterGrid({ data }: { data: FindLettersData }) {
  const rows = data.grid.length;
  const cols = data.grid[0]?.length ?? 0;
  return (
    <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {data.grid.map((row, y) =>
        row.map((letter, x) => (
          <g key={`${x}-${y}`}>
            <rect
              x={x * 10 + 0.6}
              y={y * 10 + 0.6}
              width="8.8"
              height="8.8"
              rx="1.6"
              fill="#ffffff"
              stroke="var(--bk-accent)"
              strokeWidth="0.45"
            />
            <text
              x={x * 10 + 5}
              y={y * 10 + 5}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontFamily: "var(--bk-heading)", fontWeight: 700, fontSize: 5.4 }}
              fill="var(--bk-ink)"
            >
              {letter}
            </text>
          </g>
        ))
      )}
    </svg>
  );
}

function Count({ data }: { data: CountData }) {
  return (
    <div className="bk-count">
      {data.items.map((item) => (
        <div className="bk-count-row" key={item.icon}>
          <div className="bk-count-items">
            {Array.from({ length: item.n }, (_, i) => (
              <CountIconSvg key={i} icon={item.icon} />
            ))}
          </div>
          <div className="bk-count-box" />
        </div>
      ))}
    </div>
  );
}

function Maze({ data, initial }: { data: MazeData; initial: string }) {
  const { cols, rows, cells } = data;
  const s = 10;
  let d = "";
  cells.forEach((open, i) => {
    const x = (i % cols) * s;
    const y = Math.floor(i / cols) * s;
    if (!(open & MAZE_WALL.top)) d += `M${x} ${y}h${s}`;
    // Vstup vľavo hore a východ vpravo dole ostávajú otvorené.
    if (!(open & MAZE_WALL.left) && i !== 0) d += `M${x} ${y}v${s}`;
    if (i % cols === cols - 1 && i !== cells.length - 1) d += `M${x + s} ${y}v${s}`;
    if (Math.floor(i / cols) === rows - 1) d += `M${x} ${y + s}h${s}`;
  });
  const gx = (cols - 1) * s + s / 2;
  const gy = (rows - 1) * s + s / 2;
  return (
    <svg viewBox={`-3 -3 ${cols * s + 6} ${rows * s + 6}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="-3" y="-3" width={cols * s + 6} height={rows * s + 6} rx="3" fill="#ffffff" />
      <path d={d} stroke="var(--bk-ink)" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <circle cx={s / 2} cy={s / 2} r="3.4" fill="var(--bk-accent)" />
      <text
        x={s / 2}
        y={s / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--bk-on-accent)"
        style={{ fontFamily: "var(--bk-heading)", fontWeight: 700, fontSize: 3.8 }}
      >
        {initial}
      </text>
      <path
        transform={`translate(${gx - 4.5} ${gy - 4.5}) scale(0.375)`}
        d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"
        fill="var(--bk-accent)"
      />
    </svg>
  );
}
