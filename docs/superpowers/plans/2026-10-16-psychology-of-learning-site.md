# Psychology of Learning Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub Pages site with a prerendered 120-question Bank and a client-side Quiz (random / in order / by week; practice / exam).

**Architecture:** `data/questions.json` is the single source; `scripts/build.mjs` prerenders the Bank into `index.html` and emits `js/data.js` + `sitemap.xml`. Quiz logic is a pure ES module (`quiz-engine.js`) tested in Node; UI modules are thin.

**Tech Stack:** HTML, CSS (custom properties), vanilla ES modules, Node 22 (`node --test`) for build and tests, Playwright for smoke/screenshots.

**Spec:** `docs/superpowers/specs/2026-10-16-psychology-of-learning-site-design.md`

## Global Constraints

- No runtime dependencies; site works from `file://`-free static hosting at `/psychology-of-learning/` (all URLs relative).
- Bank answers always visible; Quiz hides answers until answered (practice) or finished (exam).
- Exam timer = 60 s × question count.
- Random sizes: 10, 20, 50, 120.
- Keyboard: `1–4`, `A–D` answer; `Enter`, `ArrowRight` next.
- Storage key prefix `pol:`; every access wrapped in try/catch.
- Phone width 360 px with no horizontal scroll; light + dark.

## Review Focus

- True/False questions (2 options): keys `3/4` and `C/D` must be ignored, not crash → engine test `answer index out of range is rejected`.
- Resuming a saved quiz after `questions.json` changes (id missing) → discard saved session → engine test `restore drops unknown ids`.
- Exam timer reaching 0 → auto-finish with unanswered counted wrong → engine test `unanswered count as wrong`.
- Week filter + search combined in Bank → empty state message shows, not blank page → smoke test.
- Pressing keys while on the Bank or setup screen must not answer anything → UI listener only active on question screen (smoke test).

---

### Task 1: Question data + validation

**Files:** Create `data/questions.json`, `tests/data.test.mjs`

**Produces:** `{ weeks: [{week, title}], questions: [{id:"w1q1", week, n, q, options:string[], answer:number}] }`

- [ ] Write `tests/data.test.mjs`: 120 questions; 12 weeks × 10; ids unique `w{week}q{n}`; `0 ≤ answer < options.length`; options length 2 or 4; answer letters per week equal the verified key (W1 `DBAACAADDC` … W12 `CDDBCDDAAB`).
- [ ] Run `node --test tests/` → FAIL (file missing).
- [ ] Write `data/questions.json` from the verified study doc.
- [ ] Run → PASS. Commit.

### Task 2: Quiz engine

**Files:** Create `js/quiz-engine.js`, `tests/engine.test.mjs`

**Interfaces (Produces):**
- `buildSet(questions, {source:"random"|"order"|"weeks", count?, weeks?}, rng=Math.random) -> Question[]`
- `createSession(set, {mode:"practice"|"exam"}) -> Session` `{ids, answers:{[id]:number}, index, mode, startedAt, durationMs}`
- `answer(session, id, choice, question) -> boolean` (throws RangeError if choice out of range)
- `score(session, byId) -> {correct, total, byWeek:{[week]:{correct,total}}, missed:[{id, chosen|null}]}`
- `restore(saved, byId) -> Session|null`

- [ ] Tests: random returns `count` distinct; order returns 120 sorted week,n; weeks returns only chosen weeks in order; out-of-range answer rejected; unanswered count as wrong; restore drops unknown ids.
- [ ] Run → FAIL; implement; run → PASS. Commit.

### Task 3: Build script + page shell + styles

**Files:** Create `scripts/build.mjs`, `index.template.html`, `css/styles.css`, `robots.txt`; generates `index.html`, `js/data.js`, `sitemap.xml`

- [ ] `node scripts/build.mjs` writes Bank sections `<section id="week-N">` with `<article class="q">`, correct option `li.correct` with check mark, SEO meta + JSON-LD.
- [ ] Verify: `grep -c 'class="q"' index.html` → 120. Commit.

### Task 4: UI modules

**Files:** Create `js/storage.js`, `js/router.js`, `js/bank.js`, `js/quiz-ui.js`, `js/main.js`

- [ ] Storage: `load(key, fallback)`, `save(key, value)`, in-memory fallback.
- [ ] Router: `#bank` (default), `#quiz`; toggles `[data-view]`, nav `aria-current`.
- [ ] Bank: week chips + search; hides non-matching articles and empty weeks; empty-state message.
- [ ] Quiz UI: setup → question → results; practice feedback; exam timer; keyboard only on question screen; save/resume; retry missed; history (last result per id, best per quiz type).
- [ ] Commit.

### Task 5: Verify in browser

- [ ] `npx playwright` smoke: Bank shows 120; search "Pavlov" shows 1; quiz random 10 practice completes with keys; exam mode finishes; no console errors.
- [ ] Screenshots desktop + mobile, light + dark; fix layout issues. Commit.

### Task 6: Publish

- [ ] `gh repo create aryandaga/psychology-of-learning --public --source . --push`
- [ ] Enable Pages (main, `/`), add README; poll until `https://aryandaga.github.io/psychology-of-learning/` returns 200.
