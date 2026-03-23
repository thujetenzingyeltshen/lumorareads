const page = document.querySelector(".page[data-story-id][data-story-url]");

if (page) {
  const storyId = page.dataset.storyId || "";
  const storyUrl = page.dataset.storyUrl || window.location.href;
  const titleEl = document.querySelector(".story h1");
  const titleText = titleEl ? titleEl.textContent.trim() : "Lumora Story";
  const savedKey = "lumoraSaved";
  const saved = new Set(JSON.parse(localStorage.getItem(savedKey) || "[]"));
  const saveBtn = document.querySelector(".bookmark-btn");
  const copyBtn = document.querySelector(".share-copy");
  const twitterBtn = document.querySelector("[data-share='twitter']");
  const emailBtn = document.querySelector("[data-share='email']");
  const progressBar = document.getElementById("readingProgress");

  if (saveBtn && storyId) {
    const syncSavedState = () => {
      const isSaved = saved.has(storyId);
      saveBtn.classList.toggle("saved", isSaved);
      saveBtn.setAttribute("aria-pressed", String(isSaved));
    };

    syncSavedState();
    saveBtn.addEventListener("click", () => {
      if (saved.has(storyId)) {
        saved.delete(storyId);
      } else {
        saved.add(storyId);
      }
      localStorage.setItem(savedKey, JSON.stringify([...saved]));
      syncSavedState();
    });
  }

  if (twitterBtn) {
    const shareText = encodeURIComponent(`"${titleText}" - Lumora`);
    twitterBtn.href = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(storyUrl)}`;
  }

  if (emailBtn) {
    const subject = encodeURIComponent(`Lumora Story: ${titleText}`);
    const body = encodeURIComponent(`${titleText}\n${storyUrl}`);
    emailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=lumora.micro@gmail.com&subject=${subject}&body=${body}`;
    emailBtn.target = "_blank";
    emailBtn.rel = "noopener";
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
        await navigator.clipboard.writeText(storyUrl);
        setCopied();
      } catch (err) {
        const temp = document.createElement("textarea");
        temp.value = storyUrl;
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
}
