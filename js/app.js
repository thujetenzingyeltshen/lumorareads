const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const tokenize = (text) => {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

const loadIndex = () =>
  fetch("/data/search-index.json")
    .then(res => (res.ok ? res.json() : null))
    .catch(() => null);

const renderLoading = (container) => {
  container.innerHTML = Array.from({ length: 3 }).map(() => `
    <article class="card is-loading">
      <div class="skeleton title"></div>
      <div class="skeleton line"></div>
      <div class="skeleton line short"></div>
    </article>
  `).join("");
};

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Promise.all([
  fetch("/data/stories.json").then(res => res.json()),
  loadIndex()
]).then(([stories]) => {
    const container = document.getElementById("stories");
    const searchInput = document.getElementById("storySearch");
    const filtersEl = document.getElementById("storyFilters");
    const emptyEl = document.getElementById("storiesEmpty");
    const statusEl = document.getElementById("storiesStatus");
    const searchResultsEl = document.getElementById("searchResults");
    const searchToggle = document.querySelector(".search-toggle");
    const searchBar = document.querySelector(".search-nav");
    const savedKey = "lumoraSaved";
    const saved = new Set(JSON.parse(localStorage.getItem(savedKey) || "[]"));
    if (!container) return;

    let activeTag = "All";
    let query = "";

    const allTags = Array.from(
      new Set(stories.flatMap(s => s.tags || []))
    );

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

    const renderCardPhoto = (story) => {
      const src = (story.photo || "").trim();
      if (!src) {
        return `<span class="card-media is-empty" aria-hidden="true"></span>`;
      }
      return `<img class="card-media" src="${src}" alt="" loading="lazy" decoding="async">`;
    };

    const renderFilters = () => {
      if (!filtersEl) return;
      const tags = ["All", "Saved", ...allTags];
      filtersEl.innerHTML = tags.map(tag => `
        <button class="chip ${tag === activeTag ? "active" : ""}" data-tag="${tag}">
          ${tag}
        </button>
      `).join("");
    };

    const storySearchText = new Map(
      stories.map(story => [story.id, [
        story.title,
        story.summary,
        ...(story.tags || []),
        ...(story.content || []),
        ...(story.lesson ? [story.lesson] : []),
        ...(story.actionStep ? [story.actionStep] : [])
      ].join(" ").toLowerCase()])
    );

    const matches = (story) => {
      const haystack = storySearchText.get(story.id) || "";
      const tagOk = activeTag === "All" ||
        (activeTag === "Saved" && saved.has(story.id)) ||
        (story.tags || []).includes(activeTag);
      let queryOk = true;
      if (query) {
        const tokens = tokenize(query);
        if (!tokens.length) {
          queryOk = haystack.includes(query);
        } else {
          queryOk = tokens.every(token => haystack.includes(token));
        }
      }
      return tagOk && queryOk;
    };

    const renderStories = (list) => {
      container.innerHTML = list.map((s, index) => `
      <article class="card" style="animation-delay:${index * 90}ms">
        <div class="card-top">
          <div class="badges">
            ${(s.tags || []).map(tag => `<span class="badge">${tag}</span>`).join("")}
          </div>
          <div class="card-actions">
            <span class="card-date">${formatDate(s.date)}</span>
            <span class="card-read">&middot; ${estimateReadTime(s)}</span>
            <button class="bookmark-btn ${saved.has(s.id) ? "saved" : ""}" data-id="${s.id}" aria-pressed="${saved.has(s.id)}" title="Save story">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75V21l-6-3.5L6 21V4.75z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="card-main">
          ${renderCardPhoto(s)}
          <div class="card-copy">
            <h2>
              <a href="/story/?id=${s.id}">${s.title}</a>
            </h2>
            <p>${s.summary}</p>
            <a class="card-link" href="/story/?id=${s.id}">Read story</a>
          </div>
        </div>
      </article>
      `).join("");
    };

    const renderSearchResults = () => {
      if (!searchResultsEl) return;
      const tokens = tokenize(query);
      if (!tokens.length) {
        searchResultsEl.hidden = true;
        searchResultsEl.innerHTML = "";
        return;
      }

      const ranked = stories.filter((story) => {
        const haystack = storySearchText.get(story.id) || "";
        return tokens.every(token => haystack.includes(token));
      }).slice(0, 6);

      if (!ranked.length) {
        searchResultsEl.innerHTML = `<p class="search-result-empty">No matching stories.</p>`;
        searchResultsEl.hidden = false;
        return;
      }

      searchResultsEl.innerHTML = ranked.map((story) => {
        return `
          <a class="search-result-item" href="/story/?id=${story.id}">
            <span class="search-result-title">${escapeHtml(story.title)}</span>
          </a>
        `;
      }).join("");
      searchResultsEl.hidden = false;
    };

    const update = () => {
      const filtered = stories.filter(matches);
      renderStories(filtered);
      renderSearchResults();
      if (emptyEl) {
        emptyEl.style.display = filtered.length ? "none" : "block";
      }
      if (statusEl) {
        statusEl.textContent = `Showing ${filtered.length} of ${stories.length} stories`;
      }
    };

    renderLoading(container);
    renderFilters();
    update();

    if (searchToggle && searchBar && searchInput) {
      searchToggle.addEventListener("click", () => {
        const isOpen = searchBar.classList.toggle("is-open");
        searchToggle.setAttribute("aria-expanded", String(isOpen));
        if (!isOpen && searchResultsEl) {
          searchResultsEl.hidden = true;
        }
        if (isOpen) searchInput.focus();
      });
    }

    if (filtersEl) {
      filtersEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-tag]");
        if (!btn) return;
        activeTag = btn.dataset.tag;
        renderFilters();
        update();
      });
    }

    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".bookmark-btn");
      if (!btn) return;
      const id = btn.dataset.id;
      if (saved.has(id)) {
        saved.delete(id);
        btn.classList.remove("saved");
        btn.setAttribute("aria-pressed", "false");
      } else {
        saved.add(id);
        btn.classList.add("saved");
        btn.setAttribute("aria-pressed", "true");
      }
      localStorage.setItem(savedKey, JSON.stringify([...saved]));
      update();
    });

    if (searchInput) {
      const onSearchInput = (e) => {
        query = (e.target.value || "").trim().toLowerCase();
        update();
      };
      ["input", "keyup", "search", "change"].forEach((evt) => {
        searchInput.addEventListener(evt, onSearchInput);
      });
    }

    document.addEventListener("click", (e) => {
      if (!searchResultsEl || !searchInput) return;
      if (e.target.closest(".search-wrap")) return;
      searchResultsEl.hidden = true;
    });

    const subscribeForm = document.getElementById("subscribeForm");
    if (subscribeForm) {
      subscribeForm.addEventListener("submit", () => {
        const note = document.getElementById("subscribeNote");
        if (note) note.textContent = "Opening Mailchimp confirmation in a new tab...";
      });
    }
  });


