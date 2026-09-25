import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MARKETS } from "@/config/markets";
import { easterSunday, estimatedDelivery, formatDeliveryDate } from "./delivery";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("odhad doručenia", () => {
  it("Veľká noc", () => {
    assert.equal(iso(easterSunday(2026)), "2026-04-05");
    assert.equal(iso(easterSunday(2027)), "2027-03-28");
  });

  it("5 pracovných dní bez víkendu", () => {
    // piatok 25. 9. 2026 → po 28., ut 29., st 30., št 1. 10., pi 2. 10.
    assert.equal(iso(estimatedDelivery(new Date(2026, 8, 25, 15), MARKETS.sk)), "2026-10-02");
  });

  it("preskočí sviatky trhu a Vianoce", () => {
    // SK: 28. 10. nie je sviatok, CZ áno → CZ o deň neskôr
    assert.equal(iso(estimatedDelivery(new Date(2026, 9, 26), MARKETS.sk)), "2026-11-02"); // 1. 11. je nedeľa
    assert.equal(iso(estimatedDelivery(new Date(2026, 9, 26), MARKETS.cz)), "2026-11-03");
    assert.equal(iso(estimatedDelivery(new Date(2026, 11, 21), MARKETS.sk)), "2026-12-30");
  });

  it("preskočí Veľký piatok a Veľkonočný pondelok", () => {
    // št 2. 4. 2026 → pi 3. (sviatok), po 6. (sviatok), ut 7., st 8., št 9., pi 10., po 13.
    assert.equal(iso(estimatedDelivery(new Date(2026, 3, 2), MARKETS.sk)), "2026-04-13");
  });

  it("formát v jazyku trhu", () => {
    assert.equal(formatDeliveryDate(new Date(Date.UTC(2026, 9, 2)), MARKETS.sk), "2. 10.");
    assert.equal(formatDeliveryDate(new Date(Date.UTC(2026, 9, 2)), MARKETS.cz), "2. 10.");
  });
});
