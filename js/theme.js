(() => {
  const root = document.documentElement;
  const key = "lumoraTheme";

  const applyState = () => {
    const isEvening = root.classList.contains("theme-evening");
    document.querySelectorAll(".theme-toggle").forEach(btn => {
      btn.setAttribute("aria-pressed", String(isEvening));
    });
  };

  try {
    if (localStorage.getItem(key) === "evening") {
      root.classList.add("theme-evening");
    }
  } catch (e) {}

  applyState();

  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      root.classList.toggle("theme-evening");
      try {
        localStorage.setItem(key, root.classList.contains("theme-evening") ? "evening" : "light");
      } catch (e) {}
      applyState();
    });
  });
})();
