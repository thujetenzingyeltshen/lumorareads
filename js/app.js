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

const loadQuotes = () =>
  fetch("/data/quotes.json")
    .then(res => (res.ok ? res.json() : []))
    .catch(() => []);

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

const normalizeAssetPath = (value = "") => {
  const src = value.trim();
  if (!src) return "";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) {
    return src;
  }
  const absolute = src.startsWith("/") ? src : `/${src}`;
  return encodeURI(absolute);
};

const storyUrl = (story) => `/stories/${encodeURIComponent(story.id)}/`;

Promise.all([
  fetch("/data/stories.json").then(res => res.json()),
  loadIndex()
]).then(([stories]) => {
    const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const isHomePage = normalizedPath === "/" || normalizedPath.endsWith("/index.html");
    const parseStoryDate = (value) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    stories = [...stories].sort((a, b) => {
      const aDate = parseStoryDate(a.date);
      const bDate = parseStoryDate(b.date);
      if (aDate && bDate) return bDate - aDate;
      if (aDate) return -1;
      if (bDate) return 1;
      return 0;
    });

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

    let activeTag = "all";
    let query = "";

    const normalizeTag = (value = "") => value.trim().toLowerCase();
    const toTagLabel = (value = "") => {
      const cleaned = value.trim();
      if (!cleaned) return "";
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };
    const allTags = Array.from(
      new Set(
        stories.flatMap((story) => (story.tags || []).map(normalizeTag)).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    const tagFilters = [
      { label: "All", value: "all" },
      ...allTags.map((tag) => ({ label: toTagLabel(tag), value: tag }))
    ];

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
      const src = normalizeAssetPath(story.photo || "");
      if (!src) {
        return `<span class="card-media is-empty" aria-hidden="true"></span>`;
      }
      return `<img class="card-media" src="${src}" alt="" loading="lazy" decoding="async">`;
    };

    const renderFilters = () => {
      if (!filtersEl) return;
      filtersEl.innerHTML = tagFilters.map(({ label, value }) => `
        <button class="chip ${value === activeTag ? "active" : ""}" data-tag="${value}">
          ${label}
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
      const storyTags = (story.tags || []).map(tag => (tag || "").toLowerCase());
      const selectedTag = activeTag;
      const tagOk = selectedTag === "all" || storyTags.includes(selectedTag);
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
              <a href="${storyUrl(s)}">${s.title}</a>
            </h2>
            <p>${s.summary}</p>
            <a class="card-link" href="${storyUrl(s)}">Read story</a>
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
          <a class="search-result-item" href="${storyUrl(story)}">
            <span class="search-result-title">${escapeHtml(story.title)}</span>
          </a>
        `;
      }).join("");
      searchResultsEl.hidden = false;
    };

    const update = () => {
      const filtered = stories.filter(matches);
      let visibleStories = filtered;
      if (isHomePage) {
        visibleStories = filtered.slice(0, 1);
      }
      renderStories(visibleStories);
      renderSearchResults();
      if (emptyEl) {
        emptyEl.style.display = visibleStories.length ? "none" : "block";
      }
      if (statusEl) {
        statusEl.textContent = `Showing ${visibleStories.length} of ${stories.length} stories`;
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
        const selected = btn.dataset.tag || "all";
        activeTag = tagFilters.some(item => item.value === selected) ? selected : "all";
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

    const quoteTextEl = document.getElementById("quoteOfDayText");
    const quoteAuthorEl = document.getElementById("quoteOfDayAuthor");
    if (quoteTextEl && quoteAuthorEl) {
      const fallbackQuotes = [
        { text: "Small daily steps create extraordinary journeys.", author: "Lumora" }
      ];
      loadQuotes().then((loadedQuotes) => {
        const quotes = Array.isArray(loadedQuotes) && loadedQuotes.length
          ? loadedQuotes
          : fallbackQuotes;
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const dayNumber = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start.getTime()) / 86400000);
        const pick = quotes[dayNumber % quotes.length] || fallbackQuotes[0];
        const text = (pick.text || fallbackQuotes[0].text).trim();
        const author = (pick.author || fallbackQuotes[0].author).trim();
        quoteTextEl.textContent = `"${text}"`;
        quoteAuthorEl.textContent = `- ${author}`;
      });
    }
  });


