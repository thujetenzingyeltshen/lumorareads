const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const estimateReadTime = (story) => {
  const words = [
    story.title,
    story.summary,
    ...(story.content || []),
    ...(story.lesson ? [story.lesson] : []),
    ...(story.actionStep ? [story.actionStep] : [])
  ].join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

const storyUrl = (story) => `/stories/${encodeURIComponent(story.id)}/`;

fetch("/data/stories.json")
  .then(res => res.json())
  .then(stories => {
    const container = document.getElementById("savedStories");
    const emptyEl = document.getElementById("savedEmpty");
    const savedKey = "lumoraSaved";
    const saved = new Set(JSON.parse(localStorage.getItem(savedKey) || "[]"));

    const render = () => {
      const list = stories.filter(s => saved.has(s.id));
      container.innerHTML = list.map((s, index) => `
        <article class="card" style="animation-delay:${index * 90}ms">
          <div class="card-top">
            <div class="badges">
              ${(s.tags || []).map(tag => `<span class="badge">${tag}</span>`).join("")}
            </div>
            <div class="card-actions">
              <span class="card-date">${formatDate(s.date)}</span>
              <span class="card-read">&middot; ${estimateReadTime(s)}</span>
              <button class="bookmark-btn saved" data-id="${s.id}" aria-pressed="true" title="Remove from saved">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75V21l-6-3.5L6 21V4.75z"/>
                </svg>
              </button>
            </div>
          </div>
          <h2>
            <a href="${storyUrl(s)}">${s.title}</a>
          </h2>
          <p>${s.summary}</p>
          <a class="card-link" href="${storyUrl(s)}">Read story</a>
        </article>
      `).join("");

      if (emptyEl) {
        emptyEl.style.display = list.length ? "none" : "block";
      }
    };

    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".bookmark-btn");
      if (!btn) return;
      const id = btn.dataset.id;
      saved.delete(id);
      localStorage.setItem(savedKey, JSON.stringify([...saved]));
      render();
    });

    render();
  });


