import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyTypography, guessNameForms, renderNameTokens } from "./index";
import { SEED_NAMES } from "./seed-names";

const seed = (language: "sk" | "cs", name: string) => {
  const entry = SEED_NAMES.find((n) => n.language === language && n.forms.N === name);
  assert.ok(entry, `${name} v slovníku`);
  return { forms: entry.forms, gender: entry.gender, declinable: entry.declinable ?? true };
};

describe("pravidlá tvarov mena", () => {
  it("slovenčina: Janko, Peter, Katka, Mária", () => {
    assert.deepEqual(guessNameForms("Janko", "boy", "sk").forms, seed("sk", "Janko").forms);
    assert.deepEqual(guessNameForms("Peter", "boy", "sk").forms, seed("sk", "Peter").forms);
    assert.deepEqual(guessNameForms("Katka", "girl", "sk").forms, seed("sk", "Katka").forms);
    assert.equal(guessNameForms("Mária", "girl", "sk").forms.D, "Márii");
  });

  it("čeština: vokatív Petře, Tomáši, Honzo, Aničko", () => {
    assert.deepEqual(guessNameForms("Petr", "boy", "cs").forms, seed("cs", "Petr").forms);
    assert.deepEqual(guessNameForms("Tomáš", "boy", "cs").forms, seed("cs", "Tomáš").forms);
    assert.deepEqual(guessNameForms("Honza", "boy", "cs").forms, seed("cs", "Honza").forms);
    assert.deepEqual(guessNameForms("Anička", "girl", "cs").forms, seed("cs", "Anička").forms);
    assert.equal(guessNameForms("Marek", "boy", "cs").forms.V, "Marku");
  });

  it("neznáme zakončenie = nesklonné meno", () => {
    const result = guessNameForms("Zoe", "girl", "cs");
    assert.equal(result.declinable, false);
    assert.equal(result.forms.D, "Zoe");
  });
});

describe("dosadenie mena do textu", () => {
  it("pády a rod", () => {
    const text = "Toto je kniha pre {meno:A}. {meno} sa zobudil{rod:|a}.";
    assert.equal(renderNameTokens(text, seed("sk", "Janko")), "Toto je kniha pre Janka. Janko sa zobudil.");
    assert.equal(renderNameTokens(text, seed("sk", "Katka")), "Toto je kniha pre Katku. Katka sa zobudila.");
  });

  it("nesklonné meno použije záložnú vetu (J5)", () => {
    const text = "Mama pomohla {meno:D} obliecť sa.";
    const fallback = "Mama pomohla {meno} – spolu sa obliekli.";
    assert.equal(renderNameTokens(text, seed("sk", "Noah"), fallback), "Mama pomohla Noah – spolu sa obliekli.");
  });
});

describe("typografia", () => {
  it("nezlomiteľná medzera po jednopísmenových slovách, aj za sebou", () => {
    assert.equal(applyTypography("Išli a v lese našli k domu cestu.", "sk"), "Išli a v lese našli k domu cestu.");
  });

  it("úvodzovky", () => {
    assert.equal(applyTypography('Povedal "ahoj".', "sk"), "Povedal „ahoj“.");
  });
});
