import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mockPageChecker } from "./page-checker";

describe("automatická kontrola strany (I7 – I9)", () => {
  it("platný výstup adaptéra prejde", async () => {
    const verdict = await mockPageChecker.check({
      image: { storageKey: "x", width: 800, height: 400 },
      expectedCharacterCount: 2,
      layout: "classic",
    });
    assert.deepEqual(verdict, { verdict: "ok" });
  });

  it("prázdny obrázok (chyba adaptéra) sa pošle na pregenerovanie", async () => {
    const verdict = await mockPageChecker.check({
      image: { storageKey: "x", width: 0, height: 0 },
      expectedCharacterCount: 1,
      layout: "classic",
    });
    assert.equal(verdict.verdict, "regenerate");
  });
});
