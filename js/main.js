import { QUESTIONS, WEEKS } from "./data.js";
import { initBank } from "./bank.js";
import { initQuiz } from "./quiz-ui.js";
import { startRouter } from "./router.js";
import { load, save } from "./storage.js";

initBank(document);
const quiz = initQuiz({ root: document.getElementById("quiz-root"), questions: QUESTIONS, weeks: WEEKS });

let view = null;
startRouter((next) => {
  if (next === view) return;
  if (view === "quiz") quiz.hide();
  view = next;
  if (next === "quiz") {
    quiz.show();
    window.scrollTo({ top: 0 });
  }
});

/* Theme: follows the system until the person picks one. */
const toggle = document.getElementById("theme-toggle");
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
function paintToggle() {
  const dark = isDark();
  toggle.innerHTML = dark ? SUN : MOON;
  toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}
toggle.addEventListener("click", () => {
  const nextTheme = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  save("theme", nextTheme);
  paintToggle();
});
if (load("theme", null)) document.documentElement.dataset.theme = load("theme", null);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paintToggle);
paintToggle();
