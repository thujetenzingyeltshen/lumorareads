import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUOTES_PATH = ROOT / "data" / "quotes.json"


def prompt_required(label):
    while True:
        raw = input(f"{label}: ").strip()
        if raw:
            return raw
        print("This field is required.")


def main():
    parser = argparse.ArgumentParser(
        description="Add one quote to data/quotes.json"
    )
    parser.add_argument("--text", help="Quote text")
    parser.add_argument("--author", help="Quote author", default="Unknown")
    parser.add_argument(
        "--prepend",
        action="store_true",
        help="Insert at the beginning instead of appending at the end."
    )
    args = parser.parse_args()

    if QUOTES_PATH.exists():
        quotes = json.loads(QUOTES_PATH.read_text(encoding="utf-8"))
        if not isinstance(quotes, list):
            raise SystemExit("data/quotes.json must contain a JSON array.")
    else:
        quotes = []

    text = (args.text or prompt_required("Quote text")).strip()
    author = (args.author or "Unknown").strip() or "Unknown"

    quote = {
        "text": text,
        "author": author
    }

    if args.prepend:
        quotes.insert(0, quote)
    else:
        quotes.append(quote)

    QUOTES_PATH.write_text(
        json.dumps(quotes, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    print(f"Added quote by {author}. Total quotes: {len(quotes)}")


if __name__ == "__main__":
    main()
