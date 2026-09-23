import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CHARACTER_KINDS, GUIDE_ANIMALS } from "@/config/catalog";
import { MESSAGES } from "@/i18n/messages";
import { APPEARANCE_CHOICES, WIZARD_MESSAGES, WIZARD_OCCASIONS, WIZARD_TONES, WIZARD_WORLDS } from "./model";
import { rewindStatus, ProjectLockedError } from "./status";
import { maxReachableStep, progressIndex, stepBySlug } from "./steps";
import { renderDetails, renderStoryText, tokenizeName } from "./story-text";
import { capitalizeName, cleanText, validateChildName } from "./validation";

const janko = {
  forms: { N: "Janko", G: "Janka", D: "Jankovi", A: "Janka", V: "Janko", L: "Jankovi", I: "Jankom" },
  gender: "boy" as const,
  declinable: true,
};

describe("validácia mena (K1.1)", () => {
  it("2 – 12 znakov, písmená, medzera a spojovník", () => {
    assert.equal(validateChildName("Janko"), null);
    assert.equal(validateChildName("Anna Mária"), null);
    assert.equal(validateChildName("Jean-Luc"), null);
    assert.equal(validateChildName("J"), "child.name.invalid_chars");
    assert.equal(validateChildName("Janko2"), "child.name.invalid_chars");
    assert.equal(validateChildName("Maximiliánček"), "child.name.too_long");
  });
  it("nevhodné meno sa jemne odmietne", () => {
    assert.equal(validateChildName("Hitler"), "child.name.not_allowed");
  });
  it("veľké písmeno a čistenie textu", () => {
    assert.equal(capitalizeName("  anna   mária "), "Anna Mária");
    assert.equal(cleanText("  ahoj\u0000 ", 3), "aho");
    assert.equal(cleanText(42, 10), "");
  });
});

describe("stav projektu pri zmene skoršieho kroku", () => {
  it("vracia sa krok po kroku povolenými prechodmi", () => {
    assert.equal(rewindStatus("preview", "text_approved"), "text_approved");
    assert.equal(rewindStatus("approved_by_customer", "draft"), "draft");
    assert.equal(rewindStatus("hero_approved", "text_approved"), "hero_approved");
  });
  it("počas generovania a po platbe sa meniť nedá", () => {
    assert.throws(() => rewindStatus("generating", "draft"), ProjectLockedError);
    assert.throws(() => rewindStatus("paid", "draft"), ProjectLockedError);
  });
});

describe("kroky a lišta priebehu", () => {
  it("dopredu len tam, kam pustia závislosti", () => {
    const none = { hasHeroAppearance: false, heroApproved: false, storyChosen: false, bookGenerated: false, bookReady: false };
    assert.equal(maxReachableStep(none), 2);
    assert.equal(maxReachableStep({ ...none, hasHeroAppearance: true }), 3);
    assert.equal(maxReachableStep({ ...none, hasHeroAppearance: true, heroApproved: true }), 5);
    assert.equal(maxReachableStep({ ...none, heroApproved: true, storyChosen: true, bookGenerated: true, bookReady: true }), 9);
  });
  it("generovanie nie je v lište – náhľad je 7. z 8", () => {
    assert.equal(progressIndex(1), 1);
    assert.equal(progressIndex(7), 7);
    assert.equal(progressIndex(8), 7);
    assert.equal(progressIndex(9), 8);
    assert.equal(stepBySlug("pribeh")?.n, 5);
  });
});

describe("text príbehu", () => {
  it("detail cesty B alebo predvolená hodnota redaktora", () => {
    assert.equal(renderDetails("Zbalil {detail:toy|hračku}.", { toy: "dráčika" }), "Zbalil dráčika.");
    assert.equal(renderDetails("Zbalil {detail:toy|hračku}.", {}), "Zbalil hračku.");
    assert.equal(renderDetails("Pani učiteľka {detail:teacher|} sa usmiala.", {}), "Pani učiteľka sa usmiala.");
  });
  it("meno z jazykového modulu, nie ručne", () => {
    assert.equal(renderStoryText("Mama pomohla {meno:D}.", janko, "sk"), "Mama pomohla Jankovi.");
  });
  it("úprava zákazníka sa vráti na značky mena", () => {
    const edited = "Janko išiel s Jankom za Jankovi.";
    const tokenized = tokenizeName(edited, janko.forms);
    assert.equal(tokenized, "{meno} išiel s {meno:I} za {meno:D}.");
    // Typografia (J7) dáva po „s“ nezlomiteľnú medzeru.
    assert.equal(renderStoryText(tokenized, janko, "sk"), "Janko išiel s\u00a0Jankom za Jankovi.");
    assert.equal(tokenizeName("Jankovič prišiel.", janko.forms), "Jankovič prišiel.");
  });
});

describe("texty rozhrania SK a CZ", () => {
  const count = (text: string) => text.split(" · ").length;
  const lists = [
    ["chars.type.options", CHARACTER_KINDS.length],
    ["guide.animal.options", GUIDE_ANIMALS.length],
    ["child.occasion.options", WIZARD_OCCASIONS.length],
    ["wizard.q.world.options", WIZARD_WORLDS.length],
    ["wizard.q.message.options", WIZARD_MESSAGES.length],
    ["wizard.q.tone.options", WIZARD_TONES.length],
    ...Object.values(APPEARANCE_CHOICES).map((c) => [c.labels, c.ids.length] as const),
  ] as const;

  for (const language of ["sk", "cs"] as const) {
    it(`${language}: ponuky „a · b · c“ zodpovedajú identifikátorom v kóde`, () => {
      for (const [key, n] of lists) assert.equal(count(MESSAGES[language][key]), n, key);
    });
  }
});
