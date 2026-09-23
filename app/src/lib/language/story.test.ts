/*
  Akceptácia: vzorový príbeh (npm run db:seed) sa vysadí správne
  s Janko, Katka, Noah (SK) a Petr, Anička, Zoe (CZ).
*/

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { DictionaryFile } from "../../../scripts/names/types";
import { SAMPLE_EDITIONS } from "../../../scripts/seed-story";
import { applyTypography, renderNameTokens } from "./render";
import type { Gender, NameContext } from "./types";
import { validateEditionTemplate } from "./validate";

const hero = (lang: "sk" | "cs", name: string, gender: Gender): NameContext => {
  const file = JSON.parse(readFileSync(new URL(`../../../data/names/${lang}.json`, import.meta.url), "utf8")) as DictionaryFile;
  const entry = file.entries.find((e) => e.name === name && e.gender === gender);
  assert.ok(entry, `${name} v slovníku`);
  return { forms: entry.forms, gender, declinable: entry.declinable };
};

const book = (lang: "sk" | "cs", ctx: NameContext) => {
  const edition = SAMPLE_EDITIONS.find((e) => e.language === lang)!;
  return {
    title: renderNameTokens(edition.title, ctx),
    spreads: edition.spreads.map((s) => renderNameTokens(s.text, ctx, s.fallbackText)),
  };
};

describe("vzorový príbeh – slovenčina", () => {
  it("Janko", () => {
    const b = book("sk", hero("sk", "Janko", "boy"));
    assert.equal(b.title, "Janko ide do škôlky");
    assert.equal(b.spreads[0], "Ráno sa Janko zobudil skôr ako slniečko. Dnes je veľký deň – prvý deň v škôlke!");
    assert.equal(b.spreads[1], "Mama pomohla Jankovi obliecť si nové tričko a do batôžka zbalili obľúbenú hračku.");
    assert.equal(b.spreads[3], "Pred dverami škôlky sa Jankovi trochu roztriasli kolená.");
    assert.equal(b.spreads[6], "Pri kocke sedelo dievčatko, ktoré sa tiež trochu bálo. Janko si prisadol bližšie.");
  });

  it("Katka", () => {
    const b = book("sk", hero("sk", "Katka", "girl"));
    assert.equal(b.spreads[1], "Mama pomohla Katke obliecť si nové tričko a do batôžka zbalili obľúbenú hračku.");
    assert.equal(b.spreads[6], "Pri kocke sedelo dievčatko, ktoré sa tiež trochu bálo. Katka si prisadla bližšie.");
    assert.equal(b.spreads[10], "Poobede prišla mama. Katka sa rozbehla k nej: „Mami, zajtra idem zas!“");
  });

  it("Noah – nesklonné meno použije záložné vety (J5)", () => {
    const b = book("sk", hero("sk", "Noah", "boy"));
    assert.equal(b.spreads[1], "Noah si s mamou obliekol nové tričko a do batôžka zbalili obľúbenú hračku.");
    assert.equal(b.spreads[3], "Pred dverami škôlky Noah trochu zaváhal.");
    assert.ok(b.spreads.every((s) => !/[{}]/.test(s)));
  });
});

describe("vzorový príbeh – čeština", () => {
  it("Petr – vokatív Petře", () => {
    const b = book("cs", hero("cs", "Petr", "boy"));
    assert.equal(b.title, "Petr jde do školky");
    assert.equal(b.spreads[1], "Maminka pomohla Petrovi obléct nové tričko a do batůžku zabalili oblíbenou hračku.");
    assert.equal(b.spreads[4], "Paní učitelka se usmála: „Vítej, Petře! Čekali jsme na tebe.“");
  });

  it("Anička – vokatív Aničko", () => {
    const b = book("cs", hero("cs", "Anička", "girl"));
    assert.equal(b.spreads[3], "Před dveřmi školky se Aničce trochu roztřásla kolena.");
    assert.equal(b.spreads[4], "Paní učitelka se usmála: „Vítej, Aničko! Čekali jsme na tebe.“");
    assert.equal(b.spreads[6], "U kostek sedělo děvčátko, které se taky trochu bálo. Anička si přisedla blíž.");
  });

  it("Zoe – nesklonné meno použije záložné vety (J5)", () => {
    const b = book("cs", hero("cs", "Zoe", "girl"));
    assert.equal(b.spreads[1], "Zoe si s maminkou oblékla nové tričko a do batůžku zabalili oblíbenou hračku.");
    assert.equal(b.spreads[3], "Před dveřmi školky Zoe trochu zaváhala.");
    assert.equal(b.spreads[4], "Paní učitelka se usmála: „Vítej, Zoe! Čekali jsme na tebe.“");
  });
});

describe("vzorové edície prejdú kontrolou pri publikovaní", () => {
  for (const edition of SAMPLE_EDITIONS) {
    it(edition.language, () => {
      const lang = edition.language as "sk" | "cs";
      const result = validateEditionTemplate(edition, lang);
      assert.deepEqual(result.issues.filter((i) => i.severity === "error"), []);
      // Typografia sa dá aplikovať na každú vysadenú vetu.
      for (const sample of result.samples) assert.ok(applyTypography(sample.text, lang));
    });
  }
});
