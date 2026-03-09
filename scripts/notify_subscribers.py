import argparse
import json
import os
import re
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORIES_PATH = ROOT / "data" / "stories.json"
SITEMAP_PATH = ROOT / "sitemap.xml"
BUTTONDOWN_API = "https://api.buttondown.email/v1"


def parse_date(value):
    try:
        return date.fromisoformat(value)
    except Exception:
        return None


def pick_latest_story(stories):
    dated = [(parse_date(s.get("date", "")), i, s) for i, s in enumerate(stories)]
    valid = [item for item in dated if item[0] is not None]
    if valid:
        return max(valid, key=lambda item: (item[0], -item[1]))[2]
    return stories[0] if stories else None


def detect_base_url():
    if not SITEMAP_PATH.exists():
        return "https://lumorareads.online"
    text = SITEMAP_PATH.read_text(encoding="utf-8")
    match = re.search(r"<loc>(https?://[^<]+)</loc>", text)
    if not match:
        return "https://lumorareads.online"
    loc = match.group(1)
    if loc.endswith("/"):
        return loc[:-1]
    if "/" in loc[8:]:
        return loc.rsplit("/", 1)[0]
    return loc


def build_email(story, base_url):
    story_url = f"{base_url.rstrip('/')}/story/?id={story['id']}"
    subject = f"New on Lumora: {story['title']}"
    summary = story.get("summary", "").strip()
    action_step = story.get("actionStep", "").strip()

    body_lines = [
        f"# {story['title']}",
        "",
        summary,
        "",
        f"Read now: {story_url}",
    ]

    if action_step:
        body_lines.extend(["", f"Action step: {action_step}"])

    body_lines.extend([
        "",
        "Thank you for reading Lumora."
    ])

    return subject, "\n".join(body_lines)


def buttondown_request(method, path, token, payload):
    req = urllib.request.Request(
        url=f"{BUTTONDOWN_API}{path}",
        method=method,
        headers={
            "Authorization": f"Token {token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload).encode("utf-8")
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Buttondown API error ({exc.code}): {detail}") from exc


def find_story(stories, story_id):
    for story in stories:
        if story.get("id") == story_id:
            return story
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Send latest story to newsletter subscribers via Buttondown."
    )
    parser.add_argument("--story-id", help="Send this specific story ID")
    parser.add_argument("--base-url", help="Site base URL, e.g. https://lumorareads.online")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print subject/body without calling the API"
    )
    args = parser.parse_args()

    stories = json.loads(STORIES_PATH.read_text(encoding="utf-8"))
    if not stories:
        raise SystemExit("No stories found in data/stories.json")

    if args.story_id:
        story = find_story(stories, args.story_id)
        if not story:
            raise SystemExit(f'Story not found: "{args.story_id}"')
    else:
        story = pick_latest_story(stories)

    if not story:
        raise SystemExit("Could not select a story to send.")

    base_url = args.base_url or detect_base_url()
    subject, body = build_email(story, base_url)

    if args.dry_run:
        print("Subject:")
        print(subject)
        print("\nBody:")
        print(body)
        return

    token = os.environ.get("BUTTONDOWN_API_KEY", "").strip()
    if not token:
        raise SystemExit("Missing BUTTONDOWN_API_KEY environment variable.")

    draft = buttondown_request(
        "POST",
        "/emails",
        token,
        {"subject": subject, "body": body, "status": "draft"}
    )
    email_id = draft.get("id")
    if not email_id:
        raise SystemExit("Buttondown draft email created, but no ID was returned.")

    buttondown_request(
        "PATCH",
        f"/emails/{email_id}",
        token,
        {"status": "about_to_send"}
    )

    print(f'Queued newsletter for story "{story["id"]}" ({subject})')


if __name__ == "__main__":
    main()
