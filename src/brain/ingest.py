"""Load files into the brain — chat exports, and now college material too.

Expected layout — one folder per source, matching what you described (export
each AI's chats to .md, feed them in folder-wise; same idea for Moodle/Drive
downloads):

    exports/
      claude/
        some-chat.md
      gpt/
        some-chat.md
      moodle/
        assignment-3.pdf
        syllabus.docx
        marks.xlsx
        lecture-12.pptx

Every file under a source folder gets extracted to plain text (see
extract.py — PDF, DOCX, XLSX, PPTX, plus .md/.txt as before), split into
chunks (by blank-line paragraph breaks, capped at --chunk-size characters),
and each chunk becomes one fact tagged with the folder name as its `source`
and whatever --brain you pass as its brain. Files with an unsupported
extension are skipped with a note, not an error.

This is deliberately dumb for V1 — no summarization, no dedup, no deciding
what's actually important, no OCR on images inside a PDF/slide. It just
gets the text in and searchable. Smarter extraction (e.g. asking an LLM to
pull out just the durable facts before storing) is a natural next upgrade,
not a V1 requirement.

Usage:
    python -m brain.ingest --source-dir ./exports --brain coding
"""

from __future__ import annotations

import argparse
from pathlib import Path

import re
from . import db
from .extract import SUPPORTED_EXTENSIONS, extract_text


def semantic_sections(text: str) -> list[str]:
    """Parse text by logical breaks rather than fixed-length character splits."""
    clean = text.strip()
    if not clean:
        return []

    # 1. AI chat turns (e.g. Claude markdown exports with '#### User' / '#### Assistant')
    if "#### User" in clean or "#### Assistant" in clean:
        turns = [t.strip() for t in re.split(r"(?=#### (?:User|Assistant|System))", clean) if t.strip()]
        if len(turns) > 1:
            return turns

    # 2. Markdown headings (#, ##, ###)
    if re.search(r"^#{1,3}\s+", clean, re.MULTILINE):
        sections = [s.strip() for s in re.split(r"(?=^#{1,3}\s+)", clean, flags=re.MULTILINE) if s.strip()]
        if len(sections) > 1:
            return sections

    # 3. Slide or Sheet divisions
    if "## Slide " in clean or "## Sheet:" in clean:
        units = [u.strip() for u in re.split(r"(?=## (?:Slide \d+|Sheet:))", clean) if u.strip()]
        if len(units) > 1:
            return units

    # 4. Logical paragraph blocks
    paragraphs = [p.strip() for p in clean.split("\n\n") if p.strip()]
    return paragraphs if paragraphs else [clean]


def ingest_dir(source_dir: Path, brain: str, chunk_size: int = 1200) -> int:
    total = 0
    if not source_dir.exists():
        raise SystemExit(f"Source dir not found: {source_dir}")

    for source_subdir in sorted(p for p in source_dir.iterdir() if p.is_dir()):
        source = source_subdir.name  # e.g. "claude", "gpt", "moodle"
        files = sorted(
            p for p in source_subdir.iterdir()
            if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
        )
        skipped = sorted(
            p for p in source_subdir.iterdir()
            if p.is_file() and p.suffix.lower() not in SUPPORTED_EXTENSIONS
        )
        for f in skipped:
            print(f"  {f.relative_to(source_dir)} -> skipped (unsupported type)")

        for f in files:
            try:
                text = extract_text(f)
            except Exception as e:  # noqa: BLE001 - keep ingesting the rest on a bad file
                print(f"  {f.relative_to(source_dir)} -> FAILED to extract ({e})")
                continue
            if not text.strip():
                print(f"  {f.relative_to(source_dir)} -> no extractable text, skipped")
                continue

            rel_path = str(f.relative_to(source_dir))
            sections = semantic_sections(text)

            # Store as a unified, coherent context node with incremental merging & dedup
            fact_id, action = db.remember_or_merge_file(
                brain=brain,
                content=text,
                source=source,
                file_name=f.name,
                file_path=rel_path,
            )

            if action == "unchanged":
                print(f"  {rel_path} -> identical to existing node #{fact_id} (preserved, no duplicate)")
            elif action == "merged":
                print(f"  {rel_path} -> incrementally merged into existing node #{fact_id} ({len(sections)} sections)")
                total += 1
            else:
                print(f"  {rel_path} -> created unified context node #{fact_id} ({len(sections)} sections)")
                total += 1

    return total


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path,
                         help="Folder containing one subfolder per AI, each full of .md exports.")
    parser.add_argument("--brain", required=True,
                         help="Which brain to tag everything with, e.g. 'coding'.")
    parser.add_argument("--chunk-size", type=int, default=1200,
                         help="Max characters per stored fact (default: 1200).")
    args = parser.parse_args()

    db.init_db()
    print(f"Ingesting {args.source_dir} into brain '{args.brain}'...")
    total = ingest_dir(args.source_dir, args.brain, args.chunk_size)
    print(f"Done. {total} fact(s) stored.")


if __name__ == "__main__":
    main()
