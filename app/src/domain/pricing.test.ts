import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MARKETS } from "@/config/markets";
import { computePrice, type PriceSelection } from "./pricing";

const quick: PriceSelection = {
  variant: "print_ebook",
  storyPath: "A",
  extraCharacters: 0,
  pageCount: 32,
  format: "A5",
  coloringBook: false,
  extraCopies: 0,
  giftWrap: false,
};

describe("cena knihy", () => {
  it("najkratšia cesta = základná cena", () => {
    assert.equal(computePrice(quick, MARKETS.sk).totalMinor, 3290);
    assert.equal(computePrice(quick, MARKETS.cz).totalMinor, 79900);
  });

  it("príbeh na mieru, 2 postavy, 40 strán, omaľovánka", () => {
    const price = computePrice(
      { ...quick, storyPath: "C", extraCharacters: 2, pageCount: 40, coloringBook: true },
      MARKETS.sk
    );
    assert.equal(price.totalMinor, 3290 + 500 + 2 * 300 + 600 + 490);
    assert.deepEqual(
      price.surcharges.map((line) => line.id),
      ["custom_story", "extra_character", "pages_40", "coloring_book"]
    );
  });

  it("e-kniha nemá tlačové príplatky", () => {
    const price = computePrice({ ...quick, variant: "ebook", giftWrap: true, extraCopies: 2 }, MARKETS.sk);
    assert.equal(price.totalMinor, 990);
  });
});
