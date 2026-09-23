import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACTIVITIES,
  BOOK_FORMATS,
  LAYOUTS,
  PAGE_COUNTS,
  SPREADS_FOR_PAGES,
  type BookFormat,
  type LayoutId,
  type PageCount,
} from "@/config/catalog";
import { BOOK_LANGUAGES, type BookLanguage } from "@/i18n/locales";
import type { Gender } from "@/lib/language";

import { MAZE_WALL } from "../activities/generators";
import { guessedNameContext, sampleBookInput, TEST_NAMES } from "../fixtures/sample-book";
import { buildBook, BookBuildError, zoneFromScene, type BookInput } from "./build";
import { findTextOverflows } from "./limits";
import { ebookPages, interiorPages, previewSpreads } from "./pages";
import { splitText } from "./text";
import type { ActivityPart, Book } from "./types";

function sampleInput(o: {
  language?: BookLanguage;
  name?: string;
  gender?: Gender;
  pageCount?: PageCount;
  layout?: LayoutId;
  format?: BookFormat;
}): BookInput {
  const language = o.language ?? "sk";
  return sampleBookInput({
    ...o,
    language,
    name: guessedNameContext(o.name ?? "Ema", o.gender ?? "girl", language),
  });
}

describe("model knihy", () => {
  for (const pageCount of PAGE_COUNTS) {
    it(`${pageCount} strán: presný rozsah a poradie častí`, () => {
      const book = buildBook(sampleInput({ pageCount }));
      const pages = interiorPages(book);
      assert.equal(pages.length, pageCount);
      assert.equal(book.parts[0].kind, "title");
      assert.equal(book.parts.at(-1)?.kind, "imprint");
      assert.equal(book.parts.filter((p) => p.kind === "story_spread").length, SPREADS_FOR_PAGES[pageCount]);
      assert.equal(book.parts.filter((p) => p.kind === "activity").length, 4);
      // Dvojstrana príbehu vždy začína na párnej (ľavej) strane.
      for (const page of pages) {
        if (page.side === "left") assert.equal(page.number % 2, 0, `strana ${page.number}`);
      }
    });

    it(`${pageCount} strán: náhľad a e-kniha obsahujú všetky strany`, () => {
      const book = buildBook(sampleInput({ pageCount }));
      const spreads = previewSpreads(book);
      assert.equal(spreads[0].id, "cover");
      assert.equal(spreads.at(-1)?.id, "back");
      const interior = spreads.flatMap((s) => ("single" in s ? [s.single] : [s.left, s.right]))
        .filter((ref) => ref.type === "interior");
      assert.equal(interior.length, pageCount);
      assert.equal(ebookPages(book).length, pageCount + 4);
    });
  }

  it("nesedí počet dvojstrán → chyba, nie tichá kniha", () => {
    const input = sampleInput({ pageCount: 32 });
    input.options = { ...input.options, pageCount: 40 };
    assert.throws(() => buildBook(input), BookBuildError);
  });

  it("vypnutý sprievodca a list → strany na kreslenie, rozsah sa nemení", () => {
    const input = sampleInput({});
    input.options = { ...input.options, parentGuide: false, parentLetter: false };
    const book = buildBook(input);
    assert.equal(interiorPages(book).length, 32);
    assert.equal(book.parts.filter((p) => p.kind === "free_draw").length, 2);
  });

  it("meno sa dosadí cez jazykový modul – žiadne značky v knihe", () => {
    for (const language of BOOK_LANGUAGES) {
      const book = buildBook(sampleInput({ language, name: "Janko", gender: "boy" }));
      const json = JSON.stringify(book);
      assert.ok(!/\{meno|\{rod:/.test(json), `ostala značka (${language})`);
      assert.ok(book.meta.title.includes("Janko"));
    }
  });

  it("tiráž uvádza AI; pri príbehu na mieru aj text od AI (S16)", () => {
    const editorial = buildBook(sampleInput({})).parts.at(-1);
    assert.ok(editorial?.kind === "imprint" && editorial.aiNotice.includes("Redakcia TAKTIK"));
    const input = sampleInput({});
    input.story = { ...input.story, author: null };
    const custom = buildBook(input).parts.at(-1);
    assert.ok(custom?.kind === "imprint" && custom.aiNotice.includes("umelej inteligencie podľa zadania zákazníka"));
  });

  it("aktivity sú deterministické podľa projektu", () => {
    const input = sampleInput({});
    input.options = { ...input.options, activities: ["find_letters", "maze", "count", "diploma"] };
    const a = buildBook(input);
    const b = buildBook(input);
    assert.deepEqual(a.parts, b.parts);
    const other = buildBook({ ...input, seed: "iny-projekt" });
    assert.notDeepEqual(a.parts, other.parts);
  });
});

describe("aktivity", () => {
  const activityParts = (book: Book) => book.parts.filter((p): p is ActivityPart => p.kind === "activity");

  it("hľadanie písmen obsahuje každé písmeno mena a iné písmená nie sú z mena", () => {
    const input = sampleInput({ name: "Ľubka", gender: "girl" });
    input.options = { ...input.options, activities: ["find_letters", "maze", "count", "diploma"] };
    const part = activityParts(buildBook(input)).find((p) => p.activity === "find_letters");
    assert.ok(part && part.activity === "find_letters");
    const flat = part.data.grid.flat();
    assert.deepEqual(part.data.targets, ["Ľ", "U", "B", "K", "A"]);
    for (const letter of part.data.targets) assert.ok(flat.includes(letter), letter);
  });

  it("bludisko je súvislé – z každej bunky sa dá dostať do cieľa", () => {
    for (const format of BOOK_FORMATS) {
      const input = sampleInput({ format });
      input.options = { ...input.options, activities: ["maze", "find_letters", "count", "diploma"] };
      const part = activityParts(buildBook(input)).find((p) => p.activity === "maze");
      assert.ok(part && part.activity === "maze");
      const { cols, rows, cells } = part.data;
      const seen = new Set([0]);
      const queue = [0];
      while (queue.length) {
        const i = queue.shift()!;
        const x = i % cols;
        const next = [
          cells[i] & MAZE_WALL.top ? i - cols : -1,
          cells[i] & MAZE_WALL.bottom ? i + cols : -1,
          cells[i] & MAZE_WALL.left && x > 0 ? i - 1 : -1,
          cells[i] & MAZE_WALL.right && x < cols - 1 ? i + 1 : -1,
        ];
        for (const n of next) {
          if (n < 0 || seen.has(n)) continue;
          seen.add(n);
          queue.push(n);
        }
      }
      assert.equal(seen.size, cols * rows, format);
    }
  });

  it("všetkých 7 aktivít sa dá vysadiť", () => {
    for (let i = 0; i + 4 <= ACTIVITIES.length + 3; i += 3) {
      const pick = [...ACTIVITIES, ...ACTIVITIES].slice(i, i + 4);
      const input = sampleInput({});
      input.options = { ...input.options, activities: pick };
      assert.equal(activityParts(buildBook(input)).length, 4);
    }
  });
});

describe("limity textu", () => {
  it("vzorový príbeh sa zmestí do všetkých layoutov, formátov a rozsahov s menom 2 aj 12 znakov", () => {
    for (const language of BOOK_LANGUAGES)
      for (const layout of LAYOUTS)
        for (const format of BOOK_FORMATS)
          for (const pageCount of PAGE_COUNTS)
            for (const { name, gender } of TEST_NAMES) {
              const book = buildBook(sampleInput({ language, layout, format, pageCount, name, gender }));
              assert.deepEqual(findTextOverflows(book), [], `${language} ${layout} ${format} ${pageCount} ${name}`);
            }
  });
});

describe("pomocné funkcie", () => {
  it("pokojná zóna z opisu scény", () => {
    assert.equal(zoneFromScene("Ulica. Pokojná zóna vpravo dole."), "right-bottom");
    assert.equal(zoneFromScene("Pokojná zóna hore."), "left-top");
    assert.equal(zoneFromScene(undefined), "left-top");
  });

  it("delenie textu pre obrázkový layout za vetou", () => {
    const [a, b] = splitText("Prvá veta je tu. A druhá veta je tiež tu.");
    assert.equal(a, "Prvá veta je tu.");
    assert.equal(b, "A druhá veta je tiež tu.");
  });
});
