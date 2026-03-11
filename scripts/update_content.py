import argparse
import json
import math
import re
from datetime import date
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
        f'<a class="btn ghost" href="/story/?id={latest["id"]}">Read today\'s pick</a>'
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


def update_sitemap(stories, base_url):
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    today = date.today().isoformat()

    static_pages = [
        "/",
        "/stories/",
        "/about/",
        "/saved/",
        "/story/",
        "/submit/",
        "/privacy/",
        "/thankyou/",
        "/404.html"
    ]

    story_pages = [f"/story/?id={story.get('id')}" for story in stories]

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
            return loc[:-1]
        return loc.rsplit("/", 1)[0]
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

