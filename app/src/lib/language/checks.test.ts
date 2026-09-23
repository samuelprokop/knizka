import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHyphenator, hyphenateText, SOFT_HYPHEN } from "./hyphenation/hyphenate";
import * as cs from "./hyphenation/patterns-cs";
import * as sk from "./hyphenation/patterns-sk";
import { findProfanity, moderateName } from "./moderation";
import { applyTypography } from "./render";
import { guessNameForms } from "./rules";
import { validateEditionTemplate } from "./validate";

const NB = " ";

describe("validátor edície (J5, J11, J13)", () => {
  const base = { title: "{meno} a drak", annotation: "Príbeh o odvahe." };

  it("chýbajúca záložná veta pri skloňovanom mene", () => {
    const result = validateEditionTemplate({ ...base, spreads: [{ text: "Mama dala {meno:D} jablko." }] }, "sk");
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === "missing_fallback" && i.spread === 0));
  });

  it("záložná veta nesmie skloňovať", () => {
    const result = validateEditionTemplate(
      { ...base, spreads: [{ text: "Mama dala {meno:D} jablko.", fallbackText: "Aj {meno:G} jablko." }] },
      "sk"
    );
    assert.ok(result.issues.some((i) => i.code === "fallback_inflected"));
  });

  it("syntax, neznáma značka, nalepená koncovka", () => {
    const result = validateEditionTemplate(
      { ...base, spreads: [{ text: "{meno:X} a {rod:bol} a {vek} a {meno}ov pes {" }] },
      "sk"
    );
    const codes = result.issues.map((i) => i.code);
    for (const code of ["syntax", "unknown_token", "attached_suffix"]) assert.ok(codes.includes(code as never), code);
  });

  it("čeština: upozorní na oslovenie bez vokatívu", () => {
    const result = validateEditionTemplate({ ...base, spreads: [{ text: "„{meno}, pojď sem!“" }] }, "cs");
    assert.ok(result.issues.some((i) => i.code === "vocative" && i.severity === "warning"));
  });

  it("test sadzby s najdlhším menom a limitom layoutu", () => {
    const text = "Keď {meno} prišiel domov, mama sa usmiala.";
    const result = validateEditionTemplate({ ...base, spreads: [{ text }] }, "sk", { maxCharsPerSpread: 45 });
    assert.ok(result.samples.some((s) => s.hero === "Ed"));
    assert.ok(result.issues.some((i) => i.code === "too_long" && i.message.includes("Maximiliánko")));
  });

  it("názov a anotácia smú len nominatív a oslovenie", () => {
    const result = validateEditionTemplate({ title: "Kniha pre {meno:A}", annotation: "", spreads: [] }, "sk");
    assert.ok(result.issues.some((i) => i.code === "inflected_without_fallback" && i.field === "title"));
  });
});

describe("pravidlá – hraničné prípady (J4)", () => {
  const forms = (name: string, gender: "boy" | "girl", lang: "sk" | "cs") =>
    Object.values(guessNameForms(name, gender, lang).forms).join(" ");

  it("slovenčina", () => {
    assert.equal(forms("Marek", "boy", "sk"), "Marek Marka Markovi Marka Marek Markovi Markom");
    assert.equal(forms("Alexander", "boy", "sk"), "Alexander Alexandra Alexandrovi Alexandra Alexander Alexandrovi Alexandrom");
    assert.equal(forms("Oliver", "boy", "sk"), "Oliver Olivera Oliverovi Olivera Oliver Oliverovi Oliverom");
    assert.equal(forms("Soňa", "girl", "sk"), "Soňa Sone Soni Soňu Soňa Soni Soňou");
    assert.equal(forms("Andrea", "girl", "sk"), "Andrea Andrey Andrei Andreu Andrea Andrei Andreou");
    assert.equal(forms("René", "boy", "sk"), "René Reného Renému Reného René Reném Reném");
  });

  it("čeština", () => {
    assert.equal(forms("Zdeněk", "boy", "cs"), "Zdeněk Zdeňka Zdeňkovi Zdeňka Zdeňku Zdeňkovi Zdeňkem");
    assert.equal(forms("Vavřinec", "boy", "cs"), "Vavřinec Vavřince Vavřincovi Vavřince Vavřinče Vavřincovi Vavřincem");
    assert.equal(forms("Káťa", "girl", "cs"), "Káťa Káti Kátě Káťu Káťo Kátě Káťou");
    assert.equal(forms("Alice", "girl", "cs"), "Alice Alice Alici Alici Alice Alici Alicí");
    assert.equal(forms("Hugo", "boy", "cs"), "Hugo Huga Hugovi Huga Hugo Hugovi Hugem");
    assert.equal(forms("Jiří", "boy", "cs"), "Jiří Jiřího Jiřímu Jiřího Jiří Jiřím Jiřím");
    assert.equal(forms("Míša", "boy", "cs"), "Míša Míši Míšovi Míšu Míšo Míšovi Míšou");
  });

  it("nevyslovované -h je nesklonné", () => {
    assert.equal(guessNameForms("Noah", "boy", "sk").declinable, false);
    assert.equal(guessNameForms("Sarah", "girl", "cs").declinable, false);
  });
});

describe("typografia (J7)", () => {
  it("pomlčka, trojbodka, dátum, jednotka, skratka", () => {
    assert.equal(applyTypography("Bol to on - a potom...", "sk"), `Bol to on${NB}– a${NB}potom…`);
    assert.equal(applyTypography("Meniny má 21. 8. a prešiel 5 km.", "sk"), `Meniny má 21.${NB}8. a${NB}prešiel 5${NB}km.`);
    assert.equal(applyTypography("Prišiel sv. Mikuláš.", "sk"), `Prišiel sv.${NB}Mikuláš.`);
    assert.equal(applyTypography("Řekl 'ahoj'.", "cs"), "Řekl ‚ahoj‘.");
  });

  it("delenie slov – mäkké spojovníky, meno sa nedelí", () => {
    const hyphenSk = createHyphenator(sk.PATTERNS, sk.EXCEPTIONS, { leftMin: 2, rightMin: 3 });
    const hyphenCs = createHyphenator(cs.PATTERNS, cs.EXCEPTIONS, { leftMin: 2, rightMin: 3 });
    assert.equal(hyphenSk("dobrodružstvo").join("-"), "dob-ro-druž-stvo");
    assert.equal(hyphenCs("strašidelné").join("-"), "stra-ši-delné");
    const text = hyphenateText("Maximiliánko nezabudnuteľný", hyphenSk, ["Maximiliánko"]);
    assert.ok(text.startsWith("Maximiliánko "));
    assert.ok(text.includes(SOFT_HYPHEN));
  });
});

describe("moderácia mien a venovaní (S9)", () => {
  it("blokuje vulgarizmy aj s obmenami", () => {
    for (const name of ["Kurva", "K0k0t", "Kkkurvaa", "Pičo", "Jebko"]) {
      assert.deepEqual(moderateName(name, "sk"), { status: "blocked", reason: "profanity" }, name);
    }
    assert.deepEqual(moderateName("Hitler", "cs"), { status: "blocked", reason: "forbidden" });
  });

  it("neplatné a podozrivé mená", () => {
    assert.equal(moderateName("A", "sk").status, "blocked");
    assert.deepEqual(moderateName("Jan2", "cs"), { status: "blocked", reason: "invalid" });
    assert.deepEqual(moderateName("Brrr", "sk"), { status: "review", reason: "suspicious" });
  });

  it("povolí bežné, dvojité a cudzie mená", () => {
    for (const name of ["Anna Mária", "Jean-Pierre", "Izidor", "Kurt", "Zoe", "Chloé"]) {
      assert.deepEqual(moderateName(name, "sk"), { status: "ok" }, name);
    }
  });

  it("venovanie: nález ide na ručné preverenie, bežné slová nie", () => {
    assert.deepEqual(findProfanity("Ty debil, všetko najlepšie", "sk"), ["debil"]);
    assert.deepEqual(findProfanity("Kopica sena a špica veže, kokos a židle", "sk"), []);
  });
});
