// Pure quiz logic: no DOM, no storage. Shared by the browser UI and the Node tests.

export const SECONDS_PER_QUESTION = 60;

/** Map of id -> question. */
export function indexById(questions) {
  return Object.fromEntries(questions.map((q) => [q.id, q]));
}

/** Deterministic PRNG (mulberry32) so tests can shuffle reproducibly. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const inOrder = (a, b) => a.week - b.week || a.n - b.n;

/**
 * Pick the questions for a quiz.
 * @param {"random"|"order"|"weeks"|"vercel"|"vercel-missed"} opts.source
 * @param {number} [opts.count]   random only
 * @param {number[]} [opts.weeks] weeks only
 */
export function buildSet(questions, { source, count = 10, weeks = [] }, rng = Math.random) {
  const sorted = questions.filter((q) => q.week >= 1).sort(inOrder); // the 120 assignment questions
  const vercel = questions.filter((q) => q.week === 0).sort((a, b) => a.n - b.n); // NPTEL Vercel set
  if (source === "vercel") return vercel;
  if (source === "vercel-missed") return vercel.filter((q) => q.status === "wrong");
  if (source === "order") return sorted;
  if (source === "weeks") {
    const chosen = new Set(weeks.map(Number));
    return sorted.filter((q) => chosen.has(q.week));
  }
  if (source === "random") {
    return shuffled(sorted, rng).slice(0, Math.max(1, Math.min(count, sorted.length)));
  }
  throw new Error(`Unknown source: ${source}`);
}

/** A fresh quiz session. Exam mode gets a time budget; practice has none. */
export function createSession(set, { mode = "practice", label = "" } = {}) {
  return {
    ids: set.map((q) => q.id),
    answers: {},
    index: 0,
    mode,
    label,
    startedAt: Date.now(),
    durationMs: mode === "exam" ? set.length * SECONDS_PER_QUESTION * 1000 : null,
    finished: false,
  };
}

/** Record a choice. Returns whether it is correct. Throws RangeError for an impossible option. */
export function answer(session, id, choice, question) {
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
    throw new RangeError(`Option ${choice} out of range for ${id}`);
  }
  session.answers[id] = choice;
  return choice === question.answer;
}

/** Score a session; unanswered questions count as wrong. */
export function score(session, byId) {
  const byWeek = {};
  const missed = [];
  let correct = 0;
  for (const id of session.ids) {
    const q = byId[id];
    if (!q) continue;
    const w = (byWeek[q.week] ??= { correct: 0, total: 0 });
    w.total++;
    const chosen = id in session.answers ? session.answers[id] : null;
    if (chosen === q.answer) {
      correct++;
      w.correct++;
    } else {
      missed.push({ id, chosen });
    }
  }
  const total = Object.values(byWeek).reduce((s, w) => s + w.total, 0);
  return { correct, total, byWeek, missed };
}

/** Rebuild a saved session; drops ids the data no longer has. Returns null if unusable. */
export function restore(saved, byId) {
  if (!saved || !Array.isArray(saved.ids) || typeof saved.answers !== "object" || saved.answers === null) return null;
  const ids = saved.ids.filter((id) => byId[id]);
  if (!ids.length) return null;
  const answers = {};
  for (const id of ids) {
    const c = saved.answers[id];
    if (Number.isInteger(c) && c >= 0 && c < byId[id].options.length) answers[id] = c;
  }
  return {
    ids,
    answers,
    index: Math.min(Math.max(0, saved.index | 0), ids.length - 1),
    mode: saved.mode === "exam" ? "exam" : "practice",
    label: String(saved.label || ""),
    startedAt: Number(saved.startedAt) || Date.now(),
    durationMs: saved.mode === "exam" ? ids.length * SECONDS_PER_QUESTION * 1000 : null,
    finished: Boolean(saved.finished),
  };
}
