import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));
const { weeks, questions } = data;

// Accepted answers as shown on the NPTEL portal (noc26_hs206), verified 2026-10-16.
const KEY = {
  1: "DBAACAADDC", 2: "BCCCAADBAA", 3: "DCDCADBADC", 4: "DCDDAADBAD",
  5: "DBBAAADBAD", 6: "CCABDADDCB", 7: "CDDDAADDBB", 8: "CDACAADDAB",
  9: "DBBDDDCDAA", 10: "CDDDABCDAD", 11: "CDADBCADAB", 12: "CDDBCDDAAB",
};

test("120 questions across 12 weeks of 10", () => {
  assert.equal(questions.length, 120);
  assert.equal(weeks.length, 12);
  for (let w = 1; w <= 12; w++) {
    assert.equal(questions.filter((q) => q.week === w).length, 10, `week ${w}`);
    assert.ok(weeks.find((x) => x.week === w)?.title, `title for week ${w}`);
  }
});

test("ids are unique and well-formed", () => {
  const ids = new Set(questions.map((q) => q.id));
  assert.equal(ids.size, 120);
  for (const q of questions) assert.equal(q.id, `w${q.week}q${q.n}`);
});

test("options and answer indices are valid", () => {
  for (const q of questions) {
    assert.ok([2, 4].includes(q.options.length), q.id);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.id);
    assert.ok(q.q.trim().length > 5, q.id);
    for (const o of q.options) assert.ok(o.trim().length > 0, q.id);
  }
});

test("answers match the portal-verified key", () => {
  for (let w = 1; w <= 12; w++) {
    const letters = questions
      .filter((q) => q.week === w)
      .sort((a, b) => a.n - b.n)
      .map((q) => "ABCD"[q.answer])
      .join("");
    assert.equal(letters, KEY[w], `week ${w}`);
  }
});
