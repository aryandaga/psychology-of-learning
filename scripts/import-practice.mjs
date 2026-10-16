// data/raw/practice-test-review.txt + data/practice-marks.json -> data/practice.json
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const raw = readFileSync(new URL("data/raw/practice-test-review.txt", root), "utf8");
const marks = JSON.parse(readFileSync(new URL("data/practice-marks.json", root), "utf8"));

const lines = raw.split(/\r?\n/).map((l) => l.trim());
const start = lines.indexOf("Answer Review");
const questions = [];
let cur = null;
for (const line of lines.slice(start + 1)) {
  const m = line.match(/^Question (\d+)$/);
  if (m) {
    cur = { n: Number(m[1]), q: null, options: [] };
    questions.push(cur);
  } else if (cur && line) {
    if (cur.q === null) cur.q = line;
    else cur.options.push(line);
  }
}

const tidy = (s) => s.replace(/-{3,}\??/g, "___").replace(/_{3,}/g, "___").replace(/''(.*?)''/g, "“$1”").replace(/"(.*?)"/g, "“$1”").replace(/\s+/g, " ").trim();
const problems = [];
const out = questions.map(({ n, q, options }) => {
  const mk = marks[String(n)];
  const find = (text) => {
    if (text == null) return null;
    const i = options.findIndex((o) => o.toLowerCase() === text.toLowerCase());
    if (i < 0) problems.push(`Q${n}: "${text}" is not one of its options`);
    return i < 0 ? null : i;
  };
  const answer = mk ? find(mk.answer) : null;
  const picked = mk && "picked" in mk ? find(mk.picked) : null;
  const fromClaude = mk?.source === "claude";
  // status = how you did on the practice test (only known where the screenshot showed it)
  const status = !mk || fromClaude ? "unknown" : picked === null ? "right" : "wrong";
  const answerSource = !mk ? null : fromClaude ? "claude" : "test";
  return { id: `p${n}`, n, week: 0, q: tidy(q), options: options.map(tidy), answer, answerSource, lowConfidence: mk?.confidence === "low", picked, status };
});

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
const count = (s) => out.filter((x) => x.status === s).length;
writeFileSync(
  new URL("data/practice.json", root),
  JSON.stringify({ source: "NPTEL Vercel practice test (119 questions; answers from the answer-review screenshot)", questions: out }, null, 1)
);
const bySource = (src) => out.filter((x) => x.answerSource === src).length;
console.log(`${out.length} NPTEL Vercel questions: ${bySource("test")} answers from the test key, ${bySource("claude")} from Claude; you got ${count("wrong")} known wrong.`);
