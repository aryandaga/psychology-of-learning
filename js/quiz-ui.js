// Quiz screens: setup -> question -> results. Logic lives in quiz-engine.js.
import { buildSet, createSession, answer, score, restore, indexById } from "./quiz-engine.js";
import { load, save, remove, persistent } from "./storage.js";

const LETTERS = "ABCD";
const SIZES = [10, 20, 50, 120];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TICK = `<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
const CROSS = `<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

export function initQuiz({ root, questions, weeks }) {
  const byId = indexById(questions);
  const weekTitle = Object.fromEntries(weeks.map((w) => [w.week, w.title]));

  const prefs = Object.assign({ source: "random", count: 20, weeks: [], mode: "practice" }, load("prefs", {}));
  let session = restore(load("session", null), byId);
  if (session?.finished) session = null;
  let screen = "setup";
  let timerId = null;
  let lastResult = null;

  /* ---------- history ---------- */
  function history() {
    const h = load("history", null);
    return h && typeof h === "object" ? { byId: h.byId || {}, best: h.best || {}, recent: h.recent || [] } : { byId: {}, best: {}, recent: [] };
  }
  function recordResult(s, r) {
    const h = history();
    for (const id of s.ids) h.byId[id] = s.answers[id] === byId[id].answer;
    const pct = Math.round((r.correct / r.total) * 100);
    const key = s.label;
    if (!(key in h.best) || pct > h.best[key]) h.best[key] = pct;
    h.recent.unshift({ label: s.label, mode: s.mode, correct: r.correct, total: r.total, at: Date.now() });
    h.recent = h.recent.slice(0, 8);
    save("history", h);
  }
  function weekBest(w) {
    const h = history().byId;
    const ids = questions.filter((q) => q.week === w).map((q) => q.id);
    const seen = ids.filter((id) => id in h);
    if (!seen.length) return "";
    return `${seen.filter((id) => h[id]).length}/${ids.length} right last time`;
  }

  /* ---------- labels ---------- */
  function sourceLabel(p) {
    if (p.source === "order") return "All 120 in order";
    if (p.source === "random") return `Random ${p.count}`;
    const ws = p.weeks.slice().sort((a, b) => a - b);
    return ws.length === 12 ? "All weeks" : `Week${ws.length > 1 ? "s" : ""} ${ws.join(", ")}`;
  }
  const modeLabel = (m) => (m === "exam" ? "exam" : "practice");
  function plannedCount(p) {
    if (p.source === "order") return 120;
    if (p.source === "random") return p.count;
    return p.weeks.length * 10;
  }

  /* ---------- setup ---------- */
  function renderSetup() {
    stopTimer();
    screen = "setup";
    const h = history();
    const resume = session
      ? `<div class="resume-banner" role="region" aria-label="Unfinished quiz">
          <p><strong>Unfinished quiz:</strong> ${esc(session.label)}, ${modeLabel(session.mode)} — question ${session.index + 1} of ${session.ids.length}.</p>
          <div class="resume-actions"><button class="btn btn-primary" data-act="resume">Resume</button><button class="btn btn-ghost" data-act="discard">Discard</button></div>
        </div>`
      : "";
    const n = plannedCount(prefs);
    root.innerHTML = `
      <h1 id="quiz-title">Quiz</h1>
      <p class="lede">Pick which questions to answer and how. ${persistent ? "Your progress is saved in this browser." : "Progress can’t be saved in this browser, but the quiz works."}</p>
      ${resume}
      <form id="setup" novalidate>
        <fieldset>
          <legend>Questions</legend>
          <div class="choice-grid">
            ${choice("source", "random", "Random", "A mix from all 12 weeks", prefs.source)}
            ${choice("source", "order", "All 120 in order", "Week 1 to Week 12", prefs.source)}
            ${choice("source", "weeks", "By week", "Choose one or more weeks", prefs.source)}
          </div>
          <div class="sub-options" data-for="random" ${prefs.source === "random" ? "" : "hidden"}>
            <div class="pill-row" role="group" aria-label="How many questions">
              ${SIZES.map((s) => `<button type="button" class="pill" data-count="${s}" aria-pressed="${prefs.count === s}">${s} questions</button>`).join("")}
            </div>
          </div>
          <div class="sub-options" data-for="weeks" ${prefs.source === "weeks" ? "" : "hidden"}>
            <div class="week-picks">
              ${weeks
                .map(
                  (w) => `<label class="week-pick"><input type="checkbox" name="week" value="${w.week}" ${prefs.weeks.includes(w.week) ? "checked" : ""}><span><b>Week ${w.week}</b>${esc(w.title)}${weekBest(w.week) ? `<span class="best"><br>${weekBest(w.week)}</span>` : ""}</span></label>`
                )
                .join("")}
            </div>
            <div class="picks-tools"><button type="button" class="btn-link" data-act="all-weeks">Select all</button><button type="button" class="btn-link" data-act="no-weeks">Clear</button></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Mode</legend>
          <div class="choice-grid two">
            ${choice("mode", "practice", "Practice", "See the answer after each question", prefs.mode)}
            ${choice("mode", "exam", "Exam", "Timed, 1 minute per question. Answers shown at the end", prefs.mode)}
          </div>
        </fieldset>
        <div class="start-row">
          <button class="btn btn-primary" type="submit" ${n ? "" : "disabled"}>Start quiz</button>
          <span class="start-summary" aria-live="polite">${n ? `${n} questions${prefs.mode === "exam" ? `, ${n} minutes` : ""}` : "Choose at least one week"}</span>
        </div>
      </form>
      ${
        h.recent.length
          ? `<div class="history"><h2>Recent results</h2><ul>${h.recent
              .map((r) => `<li><span>${esc(r.label)}, ${modeLabel(r.mode)}</span><b>${r.correct}/${r.total}</b></li>`)
              .join("")}</ul></div>`
          : ""
      }`;

    const form = root.querySelector("#setup");
    form.addEventListener("change", (e) => {
      if (e.target.name === "source" || e.target.name === "mode") prefs[e.target.name] = e.target.value;
      if (e.target.name === "week") prefs.weeks = [...form.querySelectorAll("input[name=week]:checked")].map((i) => Number(i.value));
      savePrefsAndRefresh();
    });
    form.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-count]");
      if (pill) {
        prefs.count = Number(pill.dataset.count);
        savePrefsAndRefresh();
      }
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "all-weeks") { prefs.weeks = weeks.map((w) => w.week); savePrefsAndRefresh(); }
      if (act === "no-weeks") { prefs.weeks = []; savePrefsAndRefresh(); }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      start(buildSet(questions, prefs), `${sourceLabel(prefs)}`, prefs.mode);
    });
    root.querySelector('[data-act="resume"]')?.addEventListener("click", () => renderQuestion());
    root.querySelector('[data-act="discard"]')?.addEventListener("click", () => {
      session = null;
      remove("session");
      renderSetup();
    });
  }

  function savePrefsAndRefresh() {
    save("prefs", prefs);
    const focusName = document.activeElement?.name;
    const focusValue = document.activeElement?.value;
    const focusCount = document.activeElement?.dataset?.count;
    renderSetup();
    const el = focusCount
      ? root.querySelector(`[data-count="${focusCount}"]`)
      : focusName && root.querySelector(`[name="${focusName}"][value="${focusValue}"]`);
    el?.focus();
  }

  function choice(name, value, title, desc, current) {
    const id = `${name}-${value}`;
    return `<div class="choice"><input type="radio" id="${id}" name="${name}" value="${value}" ${current === value ? "checked" : ""}><label for="${id}"><strong>${title}</strong><span>${desc}</span></label></div>`;
  }

  /* ---------- question ---------- */
  function start(set, label, mode) {
    if (!set.length) return;
    session = createSession(set, { mode, label });
    save("session", session);
    renderQuestion();
  }

  function renderQuestion() {
    screen = "question";
    const id = session.ids[session.index];
    const q = byId[id];
    const chosen = session.answers[id];
    const practice = session.mode === "practice";
    const revealed = practice && chosen !== undefined;
    const last = session.index === session.ids.length - 1;
    const answeredCount = Object.keys(session.answers).length;

    const answersHTML = q.options
      .map((o, i) => {
        let cls = "answer";
        let mark = "";
        if (revealed) {
          if (i === q.answer) { cls += " is-right"; mark = TICK; }
          else if (i === chosen) { cls += " is-wrong"; mark = CROSS; }
        } else if (i === chosen) cls += " chosen";
        return `<button class="${cls}" type="button" data-choice="${i}" ${revealed ? "disabled" : ""} aria-pressed="${i === chosen}"><span class="key" aria-hidden="true">${LETTERS[i]}</span><span>${esc(o)}</span>${mark}</button>`;
      })
      .join("");

    let feedback = "";
    if (revealed) {
      feedback = chosen === q.answer
        ? `<p class="feedback right" role="status">Correct.</p>`
        : `<p class="feedback wrong" role="status">Not quite — the answer is ${LETTERS[q.answer]}, ${esc(q.options[q.answer])}.</p>`;
    } else {
      feedback = `<p class="feedback" role="status"></p>`;
    }

    const canNext = practice ? revealed : true;
    const nextLabel = last ? "See results" : "Next question";
    const backBtn = !practice && session.index > 0 ? `<button class="btn btn-ghost" data-act="back" type="button">Previous</button>` : "";
    const finishBtn = !practice && !last ? `<button class="btn-link" data-act="finish" type="button">Finish now (${answeredCount}/${session.ids.length} answered)</button>` : "";

    root.innerHTML = `
      <h1 class="visually-hidden" id="quiz-title">Quiz</h1>
      <div class="quiz-top">
        <span class="counter">${session.index + 1} / ${session.ids.length}</span>
        <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${session.ids.length}" aria-valuenow="${session.index + 1}"><span style="width:${((session.index + 1) / session.ids.length) * 100}%"></span></div>
        ${session.mode === "exam" ? `<span class="timer" id="timer" aria-label="Time left"></span>` : ""}
        <button class="btn-link quit" data-act="quit" type="button">Exit</button>
      </div>
      <div class="question-card">
        <p class="q-meta">Week ${q.week} · ${esc(weekTitle[q.week])} · Question ${q.n}</p>
        <h2 class="q-text" id="q-text">${esc(q.q)}</h2>
        <div class="answers" role="group" aria-labelledby="q-text">${answersHTML}</div>
        ${feedback}
        <div class="q-actions">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${backBtn}<button class="btn btn-primary" data-act="next" type="button" ${canNext ? "" : "disabled"}>${nextLabel}</button>${finishBtn}</div>
          <span class="kbd-hint">Keys: <kbd>A</kbd>–<kbd>${LETTERS[q.options.length - 1]}</kbd> or <kbd>1</kbd>–<kbd>${q.options.length}</kbd> to answer, <kbd>Enter</kbd> for next</span>
        </div>
      </div>`;

    root.querySelectorAll("[data-choice]").forEach((b) => b.addEventListener("click", () => choose(Number(b.dataset.choice))));
    root.querySelector('[data-act="next"]').addEventListener("click", next);
    root.querySelector('[data-act="back"]')?.addEventListener("click", () => { session.index--; persist(); renderQuestion(); });
    root.querySelector('[data-act="finish"]')?.addEventListener("click", finish);
    root.querySelector('[data-act="quit"]').addEventListener("click", () => { persist(); renderSetup(); });

    if (session.mode === "exam") startTimer();
    const focusTarget = revealed ? root.querySelector('[data-act="next"]') : root.querySelector(".answer");
    focusTarget?.focus({ preventScroll: true });
    root.scrollIntoView?.({ block: "start" });
  }

  function choose(i) {
    const id = session.ids[session.index];
    const q = byId[id];
    if (i >= q.options.length) return;
    if (session.mode === "practice" && id in session.answers) return;
    answer(session, id, i, q);
    persist();
    renderQuestion();
  }

  function next() {
    const id = session.ids[session.index];
    if (session.mode === "practice" && !(id in session.answers)) return;
    if (session.index >= session.ids.length - 1) return finish();
    session.index++;
    persist();
    renderQuestion();
  }

  function persist() {
    if (session) save("session", session);
  }

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    const el = root.querySelector("#timer");
    const tick = () => {
      const left = session.startedAt + session.durationMs - Date.now();
      if (left <= 0) return finish(true);
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.textContent = `${m}:${String(s).padStart(2, "0")} left`;
      el.classList.toggle("low", left < 60000);
    };
    tick();
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  /* ---------- results ---------- */
  function finish(timedOut = false) {
    stopTimer();
    const s = session;
    s.finished = true;
    const r = score(s, byId);
    recordResult(s, r);
    remove("session");
    session = null;
    lastResult = { s, r, timedOut };
    renderResults();
  }

  function renderResults() {
    screen = "results";
    const { s, r, timedOut } = lastResult;
    const pct = Math.round((r.correct / r.total) * 100);
    const weeksIn = Object.keys(r.byWeek).map(Number).sort((a, b) => a - b);
    const strip = weeksIn
      .map((w) => {
        const { correct, total } = r.byWeek[w];
        const cls = correct === total ? "week-cell full" : correct / total < 0.6 ? "week-cell weak" : "week-cell";
        return `<div class="${cls}"><b>Week ${w}</b><span>${correct}/${total}</span></div>`;
      })
      .join("");
    const missed = r.missed
      .map(({ id, chosen }) => {
        const q = byId[id];
        const opts = q.options
          .map((o, i) => {
            const cls = [i === q.answer ? "correct" : "", i === chosen ? "picked" : ""].filter(Boolean).join(" ");
            return `<li${cls ? ` class="${cls}"` : ""}><span class="letter">${LETTERS[i]}</span><span><span class="opt-text">${esc(o)}</span>${i === chosen ? '<span class="visually-hidden"> (your answer)</span>' : ""}${i === q.answer ? '<span class="visually-hidden"> (correct answer)</span>' : ""}</span></li>`;
          })
          .join("");
        return `<article class="q q-missed"><div class="q-body"><p class="q-meta">Week ${q.week}, question ${q.n}</p><h3 class="q-text">${esc(q.q)}</h3><ol class="opts">${opts}</ol>${chosen === null ? '<p class="unanswered">Not answered</p>' : ""}</div></article>`;
      })
      .join("");

    root.innerHTML = `
      <h1 id="quiz-title">${timedOut ? "Time’s up" : "Results"}</h1>
      <p class="lede">${esc(s.label)}, ${modeLabel(s.mode)}.</p>
      <div class="score-head"><span class="score-big">${r.correct}<small> / ${r.total}</small></span><span class="score-pct">${pct}%</span></div>
      <div class="week-strip" aria-label="Score by week">${strip}</div>
      <div class="results-actions">
        ${r.missed.length ? `<button class="btn btn-primary" data-act="retry">Retry the ${r.missed.length} missed</button>` : ""}
        <button class="btn ${r.missed.length ? "btn-ghost" : "btn-primary"}" data-act="again">Start a new quiz</button>
        <a class="btn btn-ghost" href="#bank">Open the Bank</a>
      </div>
      <section class="missed" aria-labelledby="missed-title">
        ${
          r.missed.length
            ? `<h2 id="missed-title">What you missed</h2><p class="lede">Your pick is struck through; the right answer is highlighted.</p>${missed}`
            : `<div class="all-right"><h2 id="missed-title">Every answer right</h2><p>Nothing to review from this round.</p></div>`
        }
      </section>`;

    root.querySelector('[data-act="retry"]')?.addEventListener("click", () =>
      start(r.missed.map((m) => byId[m.id]), `Retry missed from ${s.label}`, "practice")
    );
    root.querySelector('[data-act="again"]').addEventListener("click", renderSetup);
    root.querySelector("h1").focus?.();
    window.scrollTo({ top: 0 });
  }

  /* ---------- keyboard (question screen only) ---------- */
  document.addEventListener("keydown", (e) => {
    if (screen !== "question" || !session || root.closest("[data-view]").hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    const idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
    if (idx >= 0 && k.length === 1) {
      e.preventDefault();
      choose(idx);
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      if (e.key === "Enter" && e.target.closest("button")) return; // let the focused button act
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft" && session.mode === "exam" && session.index > 0) {
      e.preventDefault();
      session.index--;
      persist();
      renderQuestion();
    }
  });

  return {
    show() {
      if (screen === "question" && session) return renderQuestion(); // keep place, restart timer
      if (screen === "results" && lastResult) return;
      renderSetup();
    },
    hide() {
      stopTimer();
    },
  };
}
