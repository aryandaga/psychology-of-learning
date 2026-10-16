# Psychology of Learning — question bank and quiz

All 120 MCQs from the 12 weekly assignments of NPTEL **Psychology of Learning** (IIT Kharagpur, noc26_hs206, July 2026), with answers checked against the course portal.

**Live site:** https://aryandaga.github.io/psychology-of-learning/

- **Bank** — every question by week, with the answer highlighted. Filter by week or search.
- **Quiz** — random (10 / 20 / 50 / 120), all 120 in order, or by week. Practice mode shows the answer after each question; exam mode is timed at 1 minute per question and shows answers at the end. Keys `A–D` / `1–4` answer, `Enter` goes next. Results list what you missed, with a one-click retry. Progress is saved in your browser.

Week 7 follows this year’s quiz page; the posted Week 7 solution PDF is from the 2025 run. Week 6 Q7 is D (the PDF prints “a”).

## Develop

No dependencies. Node 22+.

```sh
npm test        # data + quiz-engine tests
npm run build   # regenerates index.html, js/data.js, sitemap.xml from data/questions.json
```

Edit questions only in `data/questions.json`, then run the build.

| Path | What it is |
| --- | --- |
| `data/questions.json` | The 120 questions (single source of truth) |
| `scripts/build.mjs` | Prerenders the Bank into `index.html` for speed and SEO |
| `js/quiz-engine.js` | Pure quiz logic, tested in Node |
| `js/quiz-ui.js`, `js/bank.js` | The two sections |
| `docs/superpowers/` | Design spec and implementation plan |

An unofficial study aid.
