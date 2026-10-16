// Hash routing between the two views: #quiz, and #bank (default; also any in-page anchor like #week-3).
export function startRouter(onChange) {
  const apply = () => {
    const view = location.hash === "#quiz" ? "quiz" : "bank";
    for (const el of document.querySelectorAll("[data-view]")) el.hidden = el.dataset.view !== view;
    for (const a of document.querySelectorAll("[data-nav]")) {
      if (a.dataset.nav === view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    onChange(view);
  };
  window.addEventListener("hashchange", apply);
  apply();
}
