import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORIES_PATH = ROOT / "data" / "stories.json"
UPDATE_SCRIPT = ROOT / "scripts" / "update_content.py"


def slugify(value):
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value


def prompt_required(label):
    while True:
        raw = input(f"{label}: ").strip()
        if raw:
            return raw
        print("This field is required.")


def prompt_with_default(label, default):
    raw = input(f"{label} [{default}]: ").strip()
    return raw or default


def parse_content_lines(raw):
    lines = [line.strip() for line in raw.split("|")]
    return [line for line in lines if line]


def main():
    parser = argparse.ArgumentParser(
        description="Add one story to data/stories.json and run update_content.py"
    )
    parser.add_argument("--title")
    parser.add_argument("--date")
    parser.add_argument("--tags", help='Comma-separated, e.g. "motivation,discipline"')
    parser.add_argument("--summary")
    parser.add_argument(
        "--content",
        help='Paragraphs split by "|", e.g. "Para 1|Para 2|Para 3"'
    )
    parser.add_argument("--lesson")
    parser.add_argument("--action-step", dest="action_step")
    parser.add_argument("--id", dest="story_id")
    parser.add_argument("--base-url", dest="base_url")
    args = parser.parse_args()

    stories = json.loads(STORIES_PATH.read_text(encoding="utf-8"))

    title = args.title or prompt_required("Title")
    story_id = args.story_id or slugify(title)
    while not story_id:
        story_id = slugify(prompt_required("Story ID (or title)"))

    existing_ids = {s.get("id") for s in stories}
    if story_id in existing_ids:
        suffix = 2
        candidate = f"{story_id}-{suffix}"
        while candidate in existing_ids:
            suffix += 1
            candidate = f"{story_id}-{suffix}"
        print(f'ID "{story_id}" already exists, using "{candidate}" instead.')
        story_id = candidate

    story_date = args.date or prompt_with_default("Date (YYYY-MM-DD)", date.today().isoformat())
    tags_raw = args.tags or prompt_required("Tags (comma-separated)")
    tags = [t.strip().lower() for t in tags_raw.split(",") if t.strip()]
    summary = args.summary or prompt_required("Summary")
    content_raw = args.content or prompt_required('Content paragraphs (split with "|")')
    content = parse_content_lines(content_raw)
    if not content:
        print("At least one content paragraph is required.")
        sys.exit(1)
    lesson = args.lesson or prompt_required("Lesson")
    action_step = args.action_step or prompt_required("Action step")

    story = {
        "id": story_id,
        "title": title,
        "date": story_date,
        "tags": tags,
        "summary": summary,
        "content": content,
        "lesson": lesson,
        "actionStep": action_step
    }

    stories.insert(0, story)
    STORIES_PATH.write_text(json.dumps(stories, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Added story: {story_id}")

    cmd = [sys.executable, str(UPDATE_SCRIPT)]
    if args.base_url:
        cmd.extend(["--base-url", args.base_url])

    print("Running update_content.py ...")
    subprocess.run(cmd, check=True)
    print("Done.")


if __name__ == "__main__":
    main()
