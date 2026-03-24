import argparse
import json
import math
import re
from datetime import date
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def tokenize(text):
    cleaned = re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()
    tokens = [t for t in cleaned.split() if len(t) > 1]
    return tokens


def parse_date(value):
    try:
        return date.fromisoformat(value)
    except Exception:
        return None


def estimate_read_time(story):
    parts = [
        story.get("title", ""),
        story.get("summary", ""),
        " ".join(story.get("content") or []),
        story.get("lesson", ""),
        story.get("actionStep", "")
    ]
    words = len([w for w in " ".join(parts).split() if w.strip()])
    minutes = max(1, math.ceil(words / 200))
    return f"Read in {minutes} min"


def format_display_date(value):
    parsed = parse_date(value)
    if not parsed:
        return value
    return parsed.strftime("%B %d, %Y")


def story_path(story):
    return f"/stories/{story.get('id', '').strip('/')}/"


def normalize_asset_path(value):
    src = (value or "").strip()
    if not src:
        return ""
    if src.startswith("/"):
        return src
    return f"/{src}"


def render_story_page(story):
    title = escape(story.get("title", "Story"))
    description = escape(
        story.get("summary")
        or story.get("lesson")
        or ((story.get("content") or ["Read a short Lumora story with a clear lesson and one simple action step."])[0])
    )
    canonical = f"https://lumorareads.online{story_path(story)}"
    tags = story.get("tags") or []
    badges = "\n".join(
        f'          <span class="badge">{escape(tag.title())}</span>' for tag in tags
    )
    lead = (story.get("content") or [""])[0]
    paragraphs = "\n".join(
        f'        <p class="story-paragraph">{escape(paragraph)}</p>'
        for paragraph in (story.get("content") or [])[1:]
    )
    return "\n".join([
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <link rel="preconnect" href="https://fonts.googleapis.com">',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        '  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
        '  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
        '  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
        '  <link rel="icon" type="image/x-icon" href="/favicon.ico">',
        '  <link rel="manifest" href="/site.webmanifest">',
        f'  <title>{title} | Lumora Reads</title>',
        f'  <meta name="description" content="{description}">',
        f'  <link rel="canonical" href="{canonical}">',
        f'  <meta property="og:title" content="{title} | Lumora Reads">',
        f'  <meta property="og:description" content="{description}">',
        f'  <meta property="og:url" content="{canonical}">',
        '  <meta property="og:type" content="article">',
        '  <script>',
        '    (function () {',
        '      try {',
        '        if (localStorage.getItem("lumoraTheme") === "evening") {',
        '          document.documentElement.classList.add("theme-evening");',
        '        }',
        '      } catch (e) {}',
        '    })();',
        '  </script>',
        '  <link rel="stylesheet" href="/css/styles.css">',
        '</head>',
        '',
        '<body>',
        '  <a class="skip-link" href="#main">Skip to content</a>',
        f'  <div class="page story-layout" data-story-id="{escape(story.get("id", ""))}" data-story-url="{canonical}">',
        '    <div class="reading-progress" id="readingProgress" aria-hidden="true"></div>',
        '    <main id="main" class="container">',
        '      <div class="story-toolbar">',
        '        <a class="back" href="/stories/">&larr; Back</a>',
        '        <button class="theme-toggle" type="button" aria-label="Toggle evening theme" aria-pressed="false">',
        '          <svg viewBox="0 0 24 24" aria-hidden="true">',
        '            <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5z"/>',
        '          </svg>',
        '        </button>',
        '      </div>',
        '      <article class="story">',
        '        <div class="story-hero">',
        '          <p class="story-kicker">Lumora Story</p>',
        '          <div class="badges">',
        badges,
        '          </div>',
        '          <div class="story-header">',
        f'            <h1>{title}</h1>',
        '            <div class="story-tools">',
        f'              <button class="bookmark-btn" data-id="{escape(story.get("id", ""))}" aria-pressed="false" title="Save story">',
        '                <svg viewBox="0 0 24 24" aria-hidden="true">',
        '                  <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75V21l-6-3.5L6 21V4.75z"/>',
        '                </svg>',
        '              </button>',
        '              <button class="share-btn share-copy" type="button" title="Copy link" aria-label="Copy link">',
        '                <svg viewBox="0 0 24 24" aria-hidden="true">',
        '                  <path d="M14 3h5a2 2 0 0 1 2 2v5h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>',
        '                  <path d="M5 5h6v2H7v10h10v-4h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
        '                </svg>',
        '              </button>',
        '              <a class="share-btn" data-share="twitter" href="#" target="_blank" rel="noopener" title="Share on X" aria-label="Share on X">',
        '                <svg viewBox="0 0 24 24" aria-hidden="true">',
        '                  <path d="M18.9 3h2.8l-6.2 7.1 7.2 10.9h-5.6l-4.4-6.4-5.6 6.4H4.3l6.7-7.6L4 3h5.7l4 5.9L18.9 3zm-1 16.3h1.5L8.9 4.6H7.3l10.6 14.7z"/>',
        '                </svg>',
        '              </a>',
        '              <a class="share-btn" data-share="email" href="#" title="Share by email" aria-label="Share by email">',
        '                <svg viewBox="0 0 24 24" aria-hidden="true">',
        '                  <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2 8 5 8-5H4zm0 10h16V9l-8 5-8-5v8z"/>',
        '                </svg>',
        '              </a>',
        '            </div>',
        '          </div>',
        f'          <div class="story-meta">{escape(format_display_date(story.get("date", "")))} &middot; {escape(estimate_read_time(story))}</div>',
        f'          <p class="story-lede">{escape(lead)}</p>',
        '        </div>',
        '        <div class="story-content">',
        paragraphs,
        '        </div>',
        '        <div class="story-insights">',
        '          <div class="story-section insight-card">',
        '            <h3>Lesson</h3>',
        f'            <p>{escape(story.get("lesson", ""))}</p>',
        '          </div>',
        '          <div class="story-section insight-card action-card">',
        '            <h3>Action Step</h3>',
        f'            <p>{escape(story.get("actionStep", ""))}</p>',
        '          </div>',
        '        </div>',
        '      </article>',
        '    </main>',
        '    <footer class="site-footer">',
        '      <div class="container footer-inner">',
        '        <div class="footer-brand">',
        '          <span class="footer-logo-wrap">',
        '            <img class="footer-logo" src="/favicon.png" alt="">',
        '          </span>',
        '          <p>Short stories for clarity and steady growth.</p>',
        '        </div>',
        '        <div class="footer-links">',
        '          <a href="/about/">About</a>',
        '          <a href="/stories/">Stories</a>',
        '          <a href="/saved/">Saved</a>',
        '          <a href="/submit/">Submit a Story</a>',
        '          <a href="/privacy/">Privacy Policy</a>',
        '        </div>',
        '        <div class="footer-social">',
        '          <a href="#" aria-label="X" class="social-icon">',
        '            <svg viewBox="0 0 24 24" aria-hidden="true">',
        '              <path d="M18.9 3h2.8l-6.2 7.1 7.2 10.9h-5.6l-4.4-6.4-5.6 6.4H4.3l6.7-7.6L4 3h5.7l4 5.9L18.9 3zm-1 16.3h1.5L8.9 4.6H7.3l10.6 14.7z"/>',
        '            </svg>',
        '          </a>',
        '          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=lumora.micro@gmail.com" aria-label="Email" class="social-icon" target="_blank" rel="noopener">',
        '            <svg viewBox="0 0 24 24" aria-hidden="true">',
        '              <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2 8 5 8-5H4zm0 10h16V9l-8 5-8-5v8z"/>',
        '            </svg>',
        '          </a>',
        '        </div>',
        '      </div>',
        '      <div class="footer-bottom">&copy; 2026 Lumora. Built for thoughtful reading.</div>',
        '    </footer>',
        '  </div>',
        '',
        '  <script defer src="/js/theme.js"></script>',
        '  <script defer src="/js/story-page.js"></script>',
        '  <script defer src="/js/sw-register.js"></script>',
        '</body>',
        '</html>',
        ''
    ])


def update_story_pages(stories):
    stories_root = ROOT / "stories"
    for story in stories:
        story_dir = stories_root / story.get("id", "")
        story_dir.mkdir(parents=True, exist_ok=True)
        (story_dir / "index.html").write_text(
            render_story_page(story),
            encoding="utf-8"
        )


def pick_latest_story(stories):
    dated = [(parse_date(s.get("date", "")), i, s) for i, s in enumerate(stories)]
    valid = [item for item in dated if item[0] is not None]
    if valid:
        return max(valid, key=lambda item: (item[0], -item[1]))[2]
    return stories[0] if stories else None


def update_search_index(stories):
    tokens = {}
    for story in stories:
        pieces = [
            story.get("title", ""),
            story.get("summary", ""),
            " ".join(story.get("tags") or []),
            " ".join(story.get("content") or []),
            story.get("lesson", ""),
            story.get("actionStep", "")
        ]
        story_tokens = tokenize(" ".join(pieces))
        for token in story_tokens:
            tokens.setdefault(token, [])
            if story.get("id") not in tokens[token]:
                tokens[token].append(story.get("id"))

    search_index = {
        "version": 1,
        "tokens": dict(sorted(tokens.items(), key=lambda item: item[0]))
    }

    (ROOT / "data" / "search-index.json").write_text(
        json.dumps(search_index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )


def replace_block(text, marker_start, marker_end, new_block):
    pattern = re.compile(
        rf"(^[ \t]*{re.escape(marker_start)}\s*\n)(.*?)(^[ \t]*{re.escape(marker_end)}\s*$)",
        re.DOTALL | re.MULTILINE
    )

    def repl(match):
        indent = re.match(r"^[ \t]*", match.group(1)).group(0)
        indented_block = "\n".join(
            (indent + line if line else indent).rstrip()
            for line in new_block.split("\n")
        )
        return f"{match.group(1)}{indented_block}\n{match.group(3)}"

    updated, count = pattern.subn(repl, text)
    if count == 0:
        raise ValueError(f"Missing markers: {marker_start} ... {marker_end}")
    return updated


def update_index_html(stories, latest):
    index_path = ROOT / "index.html"
    html = index_path.read_text(encoding="utf-8")

    todays_pick = (
        f'<a class="btn ghost" href="{story_path(latest)}">Read today\'s pick</a>'
    )
    html = replace_block(
        html,
        "<!-- AUTO:TODAYS_PICK_START -->",
        "<!-- AUTO:TODAYS_PICK_END -->",
        todays_pick
    )

    tag_badges = "\n".join(
        f'<span class="badge">{tag.title()}</span>' for tag in (latest.get("tags") or [])
    ) or '<span class="badge">Story</span>'

    featured_html = "\n".join([
        '<article class="featured-card">',
        '  <div class="featured-copy">',
        f'    <h3>{latest.get("title","")}</h3>',
        f'    <p>{latest.get("summary","")}</p>',
        '    <div class="badges">',
        f'      {tag_badges}',
        '    </div>',
        '  </div>',
        f'  <span class="featured-meta">{estimate_read_time(latest)}</span>',
        '</article>'
    ])

    html = replace_block(
        html,
        "<!-- AUTO:FEATURED_START -->",
        "<!-- AUTO:FEATURED_END -->",
        featured_html
    )

    index_path.write_text(html, encoding="utf-8")


def update_about_html(latest):
    for relative in ["about/index.html", "about.html"]:
        about_path = ROOT / relative
        if not about_path.exists():
            continue
        html = about_path.read_text(encoding="utf-8")
        html = re.sub(
            r'(<a class="btn primary" href=")[^"]+(">\s*Read Today\'s Pick\s*</a>)',
            rf"\1{story_path(latest)}\2",
            html
        )
        about_path.write_text(html, encoding="utf-8")


def update_sitemap(stories, base_url):
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    today = date.today().isoformat()

    static_pages = [
        "/",
        "/stories/",
        "/about/",
        "/privacy/"
    ]

    story_pages = [story_path(story) for story in stories]

    urls = static_pages + story_pages

    entries = "\n".join(
        "\n".join([
            "  <url>",
            f"    <loc>{base_url}{path}</loc>",
            f"    <lastmod>{today}</lastmod>",
            "  </url>"
        ])
        for path in urls
    )

    sitemap = "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        entries,
        '</urlset>',
        ''
    ])

    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")


def update_sw_cache():
    sw_path = ROOT / "sw.js"
    if not sw_path.exists():
        return
    content = sw_path.read_text(encoding="utf-8")
    match = re.search(r'CACHE_NAME\s*=\s*"lumora-v(\d+)"', content)
    if not match:
        return
    current = int(match.group(1))
    updated = content.replace(
        f'CACHE_NAME = "lumora-v{current}"',
        f'CACHE_NAME = "lumora-v{current + 1}"'
    )
    sw_path.write_text(updated, encoding="utf-8")


def detect_base_url(sitemap_text):
    match = re.search(r"<loc>(https?://[^<]+)</loc>", sitemap_text)
    if match:
        loc = match.group(1)
        if loc.endswith("/"):
            parsed = loc[:-1]
        else:
            parsed = loc.rsplit("/", 1)[0]
        if "your-domain.com" not in parsed:
            return parsed

    cname_path = ROOT / "CNAME"
    if cname_path.exists():
        host = cname_path.read_text(encoding="utf-8").strip()
        if host:
            return f"https://{host}"

    return "https://your-domain.com"


def main():
    parser = argparse.ArgumentParser(description="Automate Lumora content updates.")
    parser.add_argument("--base-url", dest="base_url", help="Base URL for sitemap.xml")
    args = parser.parse_args()

    stories_path = ROOT / "data" / "stories.json"
    stories = json.loads(stories_path.read_text(encoding="utf-8"))
    if not stories:
        raise SystemExit("No stories found in data/stories.json")

    latest = pick_latest_story(stories)

    update_search_index(stories)
    update_index_html(stories, latest)
    update_about_html(latest)
    update_story_pages(stories)

    sitemap_path = ROOT / "sitemap.xml"
    if args.base_url:
        base_url = args.base_url
    else:
        base_url = detect_base_url(sitemap_path.read_text(encoding="utf-8"))
    update_sitemap(stories, base_url)

    update_sw_cache()

    print("Updated: data/search-index.json, index.html, sitemap.xml, sw.js")


if __name__ == "__main__":
    main()

