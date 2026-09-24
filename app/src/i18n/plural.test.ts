import assert from "node:assert/strict";
import { test } from "node:test";

import { pluralForm } from "./plural";

test("množné číslo: 1 / 2 – 4 / ostatné", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 11, 21, 1.5].map(pluralForm), ["many", "one", "few", "few", "few", "many", "many", "many", "many"]);
});
