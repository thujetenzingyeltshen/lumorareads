# Content Workflow (Automated)

Use this each time you add a new story.

## 1) Add + sync in one command (recommended)
Run:

```bash
python scripts/add_story.py
```

The script will prompt you for story fields, add the story to `data/stories.json` (newest on top), then run `scripts/update_content.py` automatically.

Optional non-interactive mode:

```bash
python scripts/add_story.py --title "Start Before You Feel Ready" --tags "motivation,discipline" --summary "You do not need confidence to begin." --content "Most people wait.|Action builds confidence." --lesson "Action creates confidence." --action-step "Take one small step today."
```

Optional with domain override:

```bash
python scripts/add_story.py --base-url https://your-domain.com
```

Optional: send newsletter to subscribers right after publish:

```bash
python scripts/add_story.py --notify-subscribers
```

This requires:
1. A Buttondown account and subscriber list.
2. Environment variable set before running:

```bash
set BUTTONDOWN_API_KEY=your_buttondown_api_key
```

## Automatic On Git Push (GitHub Actions)
If you want this to happen automatically when you push new stories:

1. In GitHub repo settings, add secret:
   - Name: `BUTTONDOWN_API_KEY`
   - Value: your Buttondown API key
2. Keep using your normal push flow to `main`.
3. Workflow file already added:
   - `.github/workflows/send-newsletter.yml`

It triggers only when `data/stories.json` changes on `main`.

## 2) If you edited stories manually, run automation
```bash
python scripts/update_content.py
```

Optional (if your domain is not set in `sitemap.xml` yet):
```bash
python scripts/update_content.py --base-url https://your-domain.com
```

To send the latest story email manually:

```bash
python scripts/notify_subscribers.py
```

To preview before sending:

```bash
python scripts/notify_subscribers.py --dry-run
```

## 3) Quick visual check
1. Open `index.html` in the browser.
2. Click the featured story and confirm the page loads.
3. Search for a keyword from the new story to confirm it appears.
