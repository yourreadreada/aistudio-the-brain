"""Turn an official chat-history export straight into brain facts.

This skips the manual "export -> save as .md -> run ingest" dance entirely:
point it at the zip Claude.ai or ChatGPT gives you, and it parses the
conversations directly and writes each one in with remember_or_merge_file()
— so re-running this after a fresh export only adds what's new/changed,
it doesn't duplicate everything you already have.

Claude.ai: Settings -> Privacy -> Export data (emails you a zip containing
conversations.json).

ChatGPT: Settings -> Data controls -> Export data (emails you a zip
containing conversations.json, structurally different from Claude's — it's
a tree of message nodes, not a flat list, because ChatGPT conversations can
branch).

Built against each platform's publicly-documented export shape. These
formats aren't guaranteed stable — if a platform changes its export schema,
this will likely raise a clear error (unexpected keys) rather than silently
producing garbage; check the error against a real sample of your export
and adjust the key lookups below if needed.

Usage:
    python -m brain.import_export --platform claude --zip export.zip --brain coding
    python -m brain.import_export --platform chatgpt --zip export.zip --brain coding
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

from . import db


def _find_conversations_json(zf: zipfile.ZipFile) -> str:
    candidates = [n for n in zf.namelist() if n.lower().endswith("conversations.json")]
    if not candidates:
        raise ValueError(
            "No conversations.json found in this zip. Is this the right export file?"
        )
    # Prefer the shallowest match (top-level over some nested backup/ copy).
    candidates.sort(key=lambda n: n.count("/"))
    return candidates[0]


def _message_text(message_text_field, content_field) -> str:
    """Claude's export has seen messages as a flat `text` string, and as a
    `content` list of blocks (`[{"type": "text", "text": "..."}]`). Handle
    both rather than assuming one."""
    if isinstance(message_text_field, str) and message_text_field.strip():
        return message_text_field.strip()
    if isinstance(content_field, list):
        parts = [
            block.get("text", "")
            for block in content_field
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(p for p in parts if p).strip()
    return ""


def convert_claude_export(zip_path: Path, brain: str) -> int:
    count = 0
    with zipfile.ZipFile(zip_path) as zf:
        conv_file = _find_conversations_json(zf)
        conversations = json.loads(zf.read(conv_file))

    if not isinstance(conversations, list):
        raise ValueError(
            f"Expected a list of conversations in {conv_file}, got {type(conversations).__name__}. "
            "Claude may have changed its export format — inspect the file directly."
        )

    for conv in conversations:
        uuid = conv.get("uuid") or conv.get("id") or ""
        name = conv.get("name") or conv.get("title") or uuid or "Untitled conversation"
        messages = conv.get("chat_messages") or conv.get("messages") or []

        lines = [f"# {name}"]
        for msg in messages:
            sender = msg.get("sender") or msg.get("role") or "unknown"
            label = "Human" if sender in ("human", "user") else "Assistant"
            text = _message_text(msg.get("text"), msg.get("content"))
            if text:
                lines.append(f"### {label}\n{text}")

        transcript = "\n\n".join(lines)
        if len(lines) <= 1:  # just the title, no actual messages extracted
            continue

        file_id = uuid or name
        _, action = db.remember_or_merge_file(
            brain=brain,
            content=transcript,
            source="claude",
            file_name=f"{name}.md",
            file_path=f"claude-export/{file_id}",
        )
        print(f"  {name!r} -> {action}")
        count += 1

    return count


def _walk_chatgpt_mapping(mapping: dict) -> list[dict]:
    """ChatGPT conversations are a tree (branching/regeneration support),
    not a flat list. Find the root and follow the first child at each step
    — the "main" branch — rather than trying to reconstruct every
    alternate regeneration."""
    root_id = None
    for node_id, node in mapping.items():
        if node.get("parent") is None:
            root_id = node_id
            break
    if root_id is None:
        return []

    ordered = []
    current_id = root_id
    seen = set()
    while current_id and current_id not in seen:
        seen.add(current_id)
        node = mapping.get(current_id, {})
        ordered.append(node)
        children = node.get("children") or []
        current_id = children[0] if children else None

    return ordered


def convert_chatgpt_export(zip_path: Path, brain: str) -> int:
    count = 0
    with zipfile.ZipFile(zip_path) as zf:
        conv_file = _find_conversations_json(zf)
        conversations = json.loads(zf.read(conv_file))

    if not isinstance(conversations, list):
        raise ValueError(
            f"Expected a list of conversations in {conv_file}, got {type(conversations).__name__}. "
            "ChatGPT may have changed its export format — inspect the file directly."
        )

    for conv in conversations:
        conv_id = conv.get("id") or conv.get("conversation_id") or ""
        title = conv.get("title") or conv_id or "Untitled conversation"
        mapping = conv.get("mapping") or {}

        lines = [f"# {title}"]
        for node in _walk_chatgpt_mapping(mapping):
            message = node.get("message")
            if not message:
                continue
            author = (message.get("author") or {}).get("role", "unknown")
            if author not in ("user", "assistant"):
                continue
            parts = (message.get("content") or {}).get("parts") or []
            text = "\n".join(p for p in parts if isinstance(p, str) and p.strip()).strip()
            if text:
                label = "Human" if author == "user" else "Assistant"
                lines.append(f"### {label}\n{text}")

        transcript = "\n\n".join(lines)
        if len(lines) <= 1:
            continue

        file_id = conv_id or title
        _, action = db.remember_or_merge_file(
            brain=brain,
            content=transcript,
            source="gpt",
            file_name=f"{title}.md",
            file_path=f"chatgpt-export/{file_id}",
        )
        print(f"  {title!r} -> {action}")
        count += 1

    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", required=True, choices=["claude", "chatgpt"])
    parser.add_argument("--zip", required=True, type=Path, help="Path to the export zip file.")
    parser.add_argument("--brain", required=True, help="Which brain to store these in, e.g. 'coding'.")
    args = parser.parse_args()

    db.init_db()
    print(f"Importing {args.platform} export from {args.zip} into brain '{args.brain}'...")

    if args.platform == "claude":
        total = convert_claude_export(args.zip, args.brain)
    else:
        total = convert_chatgpt_export(args.zip, args.brain)

    print(f"Done. {total} conversation(s) processed.")


if __name__ == "__main__":
    main()
