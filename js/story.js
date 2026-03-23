const id = new URLSearchParams(window.location.search).get("id");

const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const estimateReadTime = (story) => {
  const words = [
    story.title,
    ...(story.content || []),
    ...(story.lesson ? [story.lesson] : []),
    ...(story.actionStep ? [story.actionStep] : [])
  ].join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

const storyEl = document.getElementById("story");
if (storyEl) {
  storyEl.innerHTML = `
    <div class="story-meta">Loading story...</div>
  `;
}

fetch("/data/stories.json")
  .then(res => res.json())
  .then(stories => {
    const story = stories.find(s => s.id === id);
    if (!story) {
      document.title = "Story Not Found | Lumora Reads";
      if (storyEl) {
        storyEl.innerHTML = `
          <h1>Story not found</h1>
          <p class="story-meta">Try returning to the stories list.</p>
          <a class="btn ghost" href="index.html#stories-section">Back to stories</a>
        `;
      }
      return;
    }

    const savedKey = "lumoraSaved";
    const saved = new Set(JSON.parse(localStorage.getItem(savedKey) || "[]"));
    const isSaved = saved.has(story.id);
    const leadParagraph = (story.content && story.content[0]) ? story.content[0] : "";
    const description = story.summary || story.lesson || leadParagraph || "Read a short Lumora story with a clear lesson and one simple action step.";
    const storyUrl = `${window.location.origin}/story/?id=${encodeURIComponent(story.id)}`;
    document.title = `${story.title} | Lumora Reads`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", description);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute("href", storyUrl);
    }

    storyEl.innerHTML = `
      <div class="story-hero">
        <p class="story-kicker">Lumora Story</p>
        <div class="badges">
          ${(story.tags || []).map(tag => `<span class="badge">${tag}</span>`).join("")}
        </div>
        <div class="story-header">
          <h1>${story.title}</h1>
          <div class="story-tools">
            <button class="bookmark-btn ${isSaved ? "saved" : ""}" data-id="${story.id}" aria-pressed="${isSaved}" title="Save story">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75V21l-6-3.5L6 21V4.75z"/>
              </svg>
            </button>
            <button class="share-btn share-copy" type="button" title="Copy link" aria-label="Copy link">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3h5a2 2 0 0 1 2 2v5h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>
                <path d="M5 5h6v2H7v10h10v-4h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>
              </svg>
            </button>
            <a class="share-btn" data-share="twitter" href="#" target="_blank" rel="noopener" title="Share on X" aria-label="Share on X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.9 3h2.8l-6.2 7.1 7.2 10.9h-5.6l-4.4-6.4-5.6 6.4H4.3l6.7-7.6L4 3h5.7l4 5.9L18.9 3zm-1 16.3h1.5L8.9 4.6H7.3l10.6 14.7z"/>
              </svg>
            </a>
            <a class="share-btn" data-share="email" href="#" title="Share by email" aria-label="Share by email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2 8 5 8-5H4zm0 10h16V9l-8 5-8-5v8z"/>
              </svg>
            </a>
          </div>
        </div>
        <div class="story-meta">${formatDate(story.date)} &middot; ${estimateReadTime(story)}</div>
        ${leadParagraph ? `<p class="story-lede">${leadParagraph}</p>` : ""}
      </div>

      <div class="story-content">
        ${(story.content || []).slice(1).map(p => `<p class="story-paragraph">${p}</p>`).join("")}
      </div>

      <div class="story-insights">
        <div class="story-section insight-card">
          <h3>Lesson</h3>
          <p>${story.lesson}</p>
        </div>
        <div class="story-section insight-card action-card">
          <h3>Action Step</h3>
          <p>${story.actionStep}</p>
        </div>
      </div>
    `;

    const saveBtn = document.querySelector(".bookmark-btn");
    const copyBtn = document.querySelector(".share-copy");
    const twitterBtn = document.querySelector("[data-share='twitter']");
    const emailBtn = document.querySelector("[data-share='email']");
    const progressBar = document.getElementById("readingProgress");

    const shareUrl = storyUrl;
    const encodedUrl = encodeURIComponent(shareUrl);
    const shareText = encodeURIComponent(`"${story.title}" - Lumora`);

    if (twitterBtn) {
      twitterBtn.href = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
    }

    if (emailBtn) {
      const subject = encodeURIComponent(`Lumora Story: ${story.title}`);
      const body = encodeURIComponent(`${story.title}\n${shareUrl}`);
      emailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=lumora.micro@gmail.com&subject=${subject}&body=${body}`;
      emailBtn.target = "_blank";
      emailBtn.rel = "noopener";
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (saved.has(story.id)) {
          saved.delete(story.id);
          saveBtn.classList.remove("saved");
          saveBtn.setAttribute("aria-pressed", "false");
        } else {
          saved.add(story.id);
          saveBtn.classList.add("saved");
          saveBtn.setAttribute("aria-pressed", "true");
        }
        localStorage.setItem(savedKey, JSON.stringify([...saved]));
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const setCopied = () => {
          copyBtn.classList.add("copied");
          copyBtn.setAttribute("aria-label", "Link copied");
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.setAttribute("aria-label", "Copy link");
          }, 1400);
        };
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied();
        } catch (err) {
          const temp = document.createElement("textarea");
          temp.value = shareUrl;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
          setCopied();
        }
      });
    }

    if (progressBar) {
      const updateProgress = () => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        const progress = total > 0 ? (doc.scrollTop / total) * 100 : 0;
        progressBar.style.width = `${progress}%`;
      };
      updateProgress();
      window.addEventListener("scroll", updateProgress, { passive: true });
      window.addEventListener("resize", updateProgress);
    }
  });


