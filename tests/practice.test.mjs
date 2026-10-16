import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { questions } = JSON.parse(readFileSync(new URL("../data/practice.json", import.meta.url), "utf8"));

test("119 NPTEL Vercel questions with unique ids", () => {
  assert.equal(questions.length, 119);
  assert.equal(new Set(questions.map((q) => q.id)).size, 119);
});

test("answers are a valid option or not yet confirmed", () => {
  for (const q of questions) {
    assert.ok(q.options.length >= 2 && q.options.length <= 5, q.id);
    assert.ok(q.answer === null || (q.answer >= 0 && q.answer < q.options.length), q.id);
  }
});

test("screenshot marks for Q1–39 are applied", () => {
  const byN = Object.fromEntries(questions.map((q) => [q.n, q]));
  assert.equal(byN[5].options[byN[5].answer], "Wilhelm Wundt");
  assert.equal(byN[24].options[byN[24].answer], "Howard Gardner");
  assert.equal(byN[39].options[byN[39].answer], "physical effort");
  assert.equal(questions.filter((q) => q.answerSource === "test").length, 39);
  assert.equal(questions.filter((q) => q.status === "wrong").length, 13);
});

test("Q40–119 carry Claude's answers, clearly labelled", () => {
  const rest = questions.filter((q) => q.n >= 40);
  assert.equal(rest.length, 80);
  assert.ok(rest.every((q) => q.answer !== null && q.answerSource === "claude" && q.status === "unknown"));
});
