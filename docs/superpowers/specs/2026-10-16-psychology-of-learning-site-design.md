# Psychology of Learning — Question Bank & Quiz Site: Design

Date: 2026-10-16 · Author: Aryan Daga · Status: approved

## Intent

A study site for the NPTEL course *Psychology of Learning* (noc26_hs206, July 2026 run). The final exam draws
only on the 12 weekly assignments (120 MCQs). Success = every one of the 120 questions is on the site with the
verified accepted answer, and a student can drill them on phone or laptop with nothing to install.

Users: the author first, classmates second. No accounts, no server, nothing personal stored off-device.

## Requirements

1. **Bank** — all 120 questions, grouped by week, answers always visible (no click-to-reveal). Filter by week,
   search by text.
2. **Quiz** — three sources:
   - Random: 10 / 20 / 50 / 120 questions drawn from all weeks.
   - All 120 in order (Week 1 Q1 → Week 12 Q10).
   - By week: any set of weeks, in order.
   Two modes:
   - Practice: immediate right/wrong feedback after each answer.
   - Exam: countdown timer (1 minute per question), no feedback until the end.
3. Results screen: score, per-week breakdown, list of every missed question with your pick and the right answer,
   "Retry missed" button.
4. Progress remembered in the browser: last result per question, best score per quiz type, resume an unfinished
   quiz.
5. Keyboard: `1–4` or `A–D` to answer, `Enter` / `→` for next.
6. Clean study-app look, light + dark (follows system, with a toggle), readable on a 360px phone.
7. Published from a public GitHub repo `psychology-of-learning` via GitHub Pages.

## Data

Single source of truth: `data/questions.json`.

```json
{ "id": "w1q1", "week": 1, "n": 1, "q": "Learning is often seen as…", "options": ["blood", "bone density",
  "trauma", "experience"], "answer": 3 }
```

`weeks` metadata (title per week) sits beside the questions. Week 7 uses this year's quiz-page questions (the
posted PDF is from 2025). Week 6 Q7 answer = D (PDF typo "a").

## Architecture

Static site, no framework, no runtime dependencies.

| Unit | Job | Depends on |
| --- | --- | --- |
| `scripts/build.mjs` | Reads `questions.json`; writes the Bank as static HTML into `index.html`, writes `js/data.js`, `sitemap.xml` | Node only |
| `js/data.js` (generated) | Exports `QUESTIONS`, `WEEKS` | — |
| `js/quiz-engine.js` | Pure logic: build a question set, score, per-week breakdown, shuffle with seed | — |
| `js/storage.js` | Safe localStorage wrapper (try/catch, in-memory fallback) | — |
| `js/bank.js` | Week filter + search over the prerendered Bank DOM | — |
| `js/quiz-ui.js` | Setup, question, results screens; keyboard; timer | engine, storage, data |
| `js/router.js` | Hash routing `#bank`, `#quiz`; nav state | — |
| `js/main.js` | Wires it all, theme toggle | all |

The Bank is prerendered so it is crawlable, instant, and works with JavaScript off. SEO: unique title, meta
description, canonical, Open Graph, JSON-LD `Quiz`, semantic headings, `sitemap.xml`, `robots.txt`.

## Error handling

- Storage unavailable (private mode, blocked) → in-memory fallback, quiz still works, nothing saved.
- Corrupt saved state → discarded on load.
- Unknown hash → Bank.

## Testing

- `tests/data.test.mjs`: 12 weeks × 10 questions, unique ids, answer index in range, answer key equals the
  portal-verified key.
- `tests/engine.test.mjs`: set building for each source, scoring, breakdown, retry-missed.
- Headless browser (Playwright) smoke run + screenshots of Bank and Quiz, desktop and mobile, light and dark.
