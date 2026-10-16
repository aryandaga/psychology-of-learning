// Week filter + search over the prerendered Bank. Answers are always visible.
export function initBank(root = document) {
  const search = root.getElementById("bank-search");
  const chips = [...root.querySelectorAll(".week-chip")];
  const sections = [...root.querySelectorAll(".week-section")];
  const count = root.getElementById("result-count");
  const empty = root.getElementById("bank-empty");
  const emptyTerm = root.getElementById("empty-term");
  let week = "all";

  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'");
  const index = new Map(
    [...root.querySelectorAll(".q")].map((el) => [el, norm(el.textContent)])
  );

  function apply() {
    const term = norm(search.value.trim());
    let shown = 0;
    for (const sec of sections) {
      const inWeek = week === "all" || sec.dataset.week === week;
      let secShown = 0;
      for (const q of sec.querySelectorAll(".q")) {
        const match = inWeek && (!term || index.get(q).includes(term));
        q.hidden = !match;
        if (match) secShown++;
      }
      sec.hidden = secShown === 0;
      shown += secShown;
    }
    const scope = week === "all" ? "" : ` in Week ${week}`;
    count.textContent = term
      ? `${shown} ${shown === 1 ? "question matches" : "questions match"} “${search.value.trim()}”${scope}`
      : `${shown} questions${scope}`;
    empty.hidden = shown !== 0;
    emptyTerm.textContent = `“${search.value.trim()}”`;
  }

  function setWeek(w) {
    week = w;
    for (const c of chips) c.setAttribute("aria-pressed", String(c.dataset.week === w));
    apply();
    if (w !== "all" && !search.value) {
      document.getElementById(`week-${w}`)?.scrollIntoView({ block: "start" });
    } else {
      document.querySelector(".bank-results")?.scrollIntoView({ block: "start" });
    }
  }

  for (const c of chips) c.addEventListener("click", () => setWeek(c.dataset.week));
  search.addEventListener("input", apply);
  root.getElementById("clear-filters").addEventListener("click", () => {
    search.value = "";
    setWeek("all");
    search.focus();
  });
  apply();
}
