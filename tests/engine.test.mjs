import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSet, createSession, answer, score, restore, seededRng, indexById } from "../js/quiz-engine.js";

const { questions } = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));
const byId = indexById(questions);

test("random returns `count` distinct questions", () => {
  const set = buildSet(questions, { source: "random", count: 20 }, seededRng(7));
  assert.equal(set.length, 20);
  assert.equal(new Set(set.map((q) => q.id)).size, 20);
});

test("random with count 120 covers every question", () => {
  const set = buildSet(questions, { source: "random", count: 120 }, seededRng(1));
  assert.equal(new Set(set.map((q) => q.id)).size, 120);
});

test("order returns all 120 sorted by week then number", () => {
  const set = buildSet(questions, { source: "order" });
  assert.equal(set.length, 120);
  assert.equal(set[0].id, "w1q1");
  assert.equal(set[119].id, "w12q10");
  assert.equal(set[10].id, "w2q1");
});

test("weeks returns only the chosen weeks, in order", () => {
  const set = buildSet(questions, { source: "weeks", weeks: [7, 3] });
  assert.equal(set.length, 20);
  assert.deepEqual([...new Set(set.map((q) => q.week))], [3, 7]);
});

test("weeks with no weeks chosen returns empty set", () => {
  assert.equal(buildSet(questions, { source: "weeks", weeks: [] }).length, 0);
});

test("answer records choice and reports correctness", () => {
  const s = createSession(buildSet(questions, { source: "order" }), { mode: "practice" });
  assert.equal(answer(s, "w1q1", 3, byId.w1q1), true);
  assert.equal(answer(s, "w1q2", 0, byId.w1q2), false);
  assert.equal(s.answers.w1q1, 3);
});

test("answer index out of range is rejected", () => {
  const s = createSession([byId.w1q2], { mode: "practice" });
  assert.throws(() => answer(s, "w1q2", 2, byId.w1q2), RangeError);
  assert.equal(s.answers.w1q2, undefined);
});

test("exam session duration is 60 s per question", () => {
  const s = createSession(buildSet(questions, { source: "weeks", weeks: [1] }), { mode: "exam" });
  assert.equal(s.durationMs, 600000);
  assert.equal(createSession([byId.w1q1], { mode: "practice" }).durationMs, null);
});

test("unanswered count as wrong; breakdown by week; missed list", () => {
  const set = buildSet(questions, { source: "weeks", weeks: [1, 2] });
  const s = createSession(set, { mode: "exam" });
  answer(s, "w1q1", 3, byId.w1q1); // right
  answer(s, "w2q1", 0, byId.w2q1); // wrong (B is right)
  const r = score(s, byId);
  assert.equal(r.correct, 1);
  assert.equal(r.total, 20);
  assert.deepEqual(r.byWeek[1], { correct: 1, total: 10 });
  assert.deepEqual(r.byWeek[2], { correct: 0, total: 10 });
  assert.equal(r.missed.length, 19);
  assert.deepEqual(r.missed.find((m) => m.id === "w2q1"), { id: "w2q1", chosen: 0 });
  assert.deepEqual(r.missed.find((m) => m.id === "w1q2"), { id: "w1q2", chosen: null });
});

test("restore drops unknown ids and rejects corrupt state", () => {
  const s = createSession([byId.w1q1, byId.w1q2], { mode: "practice" });
  answer(s, "w1q1", 3, byId.w1q1);
  const saved = JSON.parse(JSON.stringify({ ...s, ids: [...s.ids, "w99q1"] }));
  const r = restore(saved, byId);
  assert.deepEqual(r.ids, ["w1q1", "w1q2"]);
  assert.equal(r.answers.w1q1, 3);
  assert.equal(restore(null, byId), null);
  assert.equal(restore({ ids: "nope" }, byId), null);
  assert.equal(restore({ ids: ["w99q1"], answers: {}, index: 0, mode: "practice" }, byId), null);
});
