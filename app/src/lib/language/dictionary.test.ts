/*
  Akceptácia J1/J4/J8: slovník mien SK + CZ (app/data/names) a pravidlá proti nemu.
*/

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { DictionaryFile } from "../../../scripts/names/types";
import { moderateName } from "./moderation";
import { renderNameTokens } from "./render";
import { guessNameForms } from "./rules";
import { CASE_KEYS } from "./types";

const load = (lang: "sk" | "cs") =>
  JSON.parse(readFileSync(new URL(`../../../data/names/${lang}.json`, import.meta.url), "utf8")) as DictionaryFile;

const DICTIONARIES = { sk: load("sk"), cs: load("cs") };

/** Deterministický výber „náhodných“ mien – test je opakovateľný. */
function sample<T>(items: T[], count: number, seed: number): T[] {
  let state = seed;
  const random = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return picked;
}

for (const lang of ["sk", "cs"] as const) {
  const { entries, sources } = DICTIONARIES[lang];

  describe(`slovník ${lang}`, () => {
    it("rozsah a zdroje s licenciou", () => {
      assert.ok(entries.length >= 1000, `${entries.length} mien`);
      for (const source of sources) assert.ok(source.license, `licencia pri ${source.name}`);
    });

    it("žiadne duplicity (meno + rod)", () => {
      const keys = entries.map((e) => `${e.name}|${e.gender}`);
      assert.equal(new Set(keys).size, keys.length);
    });

    for (const gender of ["boy", "girl"] as const) {
      it(`100 náhodných mien (${gender}) má všetky tvary vrátane vokatívu`, () => {
        const picked = sample(entries.filter((e) => e.gender === gender), 100, lang === "sk" ? 7 : 11);
        assert.equal(picked.length, 100);
        for (const entry of picked) {
          const { forms, declinable, name } = entry;
          for (const key of CASE_KEYS) assert.ok(forms[key]?.trim(), `${name}: chýba ${key}`);
          assert.equal(forms.N, name);
          if (lang === "sk") assert.equal(forms.V, forms.N, `${name}: SK oslovenie = nominatív`);
          if (!declinable) {
            assert.ok(CASE_KEYS.every((k) => forms[k] === name), `${name}: nesklonné má všetky tvary rovnaké`);
            continue;
          }
          if (lang === "cs" && gender === "girl" && name.endsWith("a")) assert.match(forms.V, /o$/, `${name}: vokatív -o`);
          if (lang === "cs" && gender === "boy" && /[^aeiouyáéíóúý]$/.test(name)) {
            assert.notEqual(forms.V, forms.N, `${name}: český vokatív`);
          }
          // Dosadenie do vety: bez zvyškov značiek, s tvarom zo slovníka.
          const ctx = { forms, gender, declinable };
          assert.equal(renderNameTokens("Kniha pre {meno:A}, {meno:V}!", ctx), `Kniha pre ${forms.A}, ${forms.V}!`);
        }
      });
    }

    it("pravidlá trafia ≥ 95 % záznamov z nezávislých zdrojov (J4)", () => {
      const reference = entries.filter((e) => e.source !== "rules");
      const hits = reference.filter((e) => {
        const guess = guessNameForms(e.name, e.gender, lang);
        return guess.declinable === e.declinable && CASE_KEYS.every((k) => guess.forms[k] === e.forms[k]);
      });
      const rate = hits.length / reference.length;
      assert.ok(reference.length >= 400, `${reference.length} referenčných záznamov`);
      assert.ok(rate >= 0.95, `presnosť ${(rate * 100).toFixed(1)} %`);
    });

    it("žiadne meno zo slovníka nezablokuje moderácia (S9)", () => {
      const blocked = entries
        .map((e) => ({ name: e.name, result: moderateName(e.name, lang) }))
        .filter(({ result }) => result.status === "blocked" && result.reason !== "length");
      assert.deepEqual(blocked, []);
    });

    it("meniny vo formáte MM-DD podľa trhu (J8)", () => {
      for (const entry of entries) {
        for (const date of Object.values(entry.nameDays)) assert.match(date!, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
      }
      const jana = entries.find((e) => e.name === "Jana" && e.gender === "girl");
      assert.deepEqual(jana?.nameDays, { sk: "08-21", cz: "05-24" });
    });

    it("domácke podoby sú v slovníku a odkazujú na základné meno (J2)", () => {
      const byKey = new Map(entries.map((e) => [`${e.name}|${e.gender}`, e]));
      for (const entry of entries) {
        for (const diminutive of entry.diminutives) {
          assert.ok(byKey.has(`${diminutive}|${entry.gender}`), `${entry.name} → ${diminutive}`);
        }
      }
    });
  });
}
