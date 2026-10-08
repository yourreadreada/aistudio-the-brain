"""Storage layer for the brain.

One SQLite file holds everything. A `facts` table stores the actual content;
an FTS5 virtual table (`facts_fts`) mirrors it for fast keyword search. Every
fact is tagged with a `brain` (which context it belongs to, e.g. "coding",
"college") and a `source` (where it came from, e.g. "claude", "gpt",
"github", "moodle") so results can always be traced back to their origin.
"""

from __future__ import annotations

import datetime
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "brain.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brain TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                file_name TEXT,
                file_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
                content,
                content='facts',
                content_rowid='id'
            );

            -- Keep facts_fts in sync with facts automatically.
            CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
                INSERT INTO facts_fts(rowid, content) VALUES (new.id, new.content);
            END;

            CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
                INSERT INTO facts_fts(facts_fts, rowid, content) VALUES ('delete', old.id, old.content);
            END;

            CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
                INSERT INTO facts_fts(facts_fts, rowid, content) VALUES ('delete', old.id, old.content);
                INSERT INTO facts_fts(rowid, content) VALUES (new.id, new.content);
            END;
            """
        )

        # Migration check for existing SQLite databases without file_name/file_path
        cur = conn.execute("PRAGMA table_info(facts)")
        cols = {row["name"] for row in cur.fetchall()}
        if "file_name" not in cols:
            conn.execute("ALTER TABLE facts ADD COLUMN file_name TEXT")
        if "file_path" not in cols:
            conn.execute("ALTER TABLE facts ADD COLUMN file_path TEXT")

        conn.commit()
    finally:
        conn.close()


def find_by_file(brain: str, file_path_or_name: str) -> sqlite3.Row | None:
    conn = _connect()
    try:
        name = Path(file_path_or_name).name
        cur = conn.execute(
            """
            SELECT * FROM facts
            WHERE brain = ? AND (file_path = ? OR file_name = ? OR file_name = ?)
            ORDER BY updated_at DESC LIMIT 1
            """,
            (brain, file_path_or_name, file_path_or_name, name),
        )
        return cur.fetchone()
    finally:
        conn.close()


def remember_or_merge_file(
    brain: str, content: str, source: str, file_name: str, file_path: str = ""
) -> tuple[int, str]:
    """Store or incrementally merge a file into a unified context node.

    Returns:
        (fact_id, action) where action is 'unchanged', 'merged', or 'created'.
    """
    clean_content = content.strip()
    existing = find_by_file(brain=brain, file_path_or_name=file_path or file_name)

    if existing:
        existing_id = existing["id"]
        existing_content = (existing["content"] or "").strip()

        if existing_content == clean_content:
            return existing_id, "unchanged"

        # Check for incremental addition: if incoming extends existing or has new sections
        merged_text = clean_content
        if clean_content.startswith(existing_content):
            merged_text = clean_content
        elif existing_content not in clean_content:
            merged_text = f"{existing_content}\n\n{clean_content}".strip()

        now = datetime.datetime.utcnow().isoformat()
        conn = _connect()
        try:
            conn.execute(
                "UPDATE facts SET content = ?, updated_at = ?, file_name = ?, file_path = ? WHERE id = ?",
                (merged_text, now, file_name, file_path or file_name, existing_id),
            )
            conn.commit()
            return existing_id, "merged"
        finally:
            conn.close()

    # Create new unified node
    fact_id = remember(brain=brain, content=clean_content, source=source, file_name=file_name, file_path=file_path)
    return fact_id, "created"


def remember(
    brain: str, content: str, source: str, file_name: str | None = None, file_path: str | None = None
) -> int:
    now = datetime.datetime.utcnow().isoformat()
    conn = _connect()
    try:
        cur = conn.execute(
            "INSERT INTO facts (brain, content, source, file_name, file_path, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (brain, content, source, file_name, file_path, now, now),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def recall(brain: str, query: str, limit: int = 10) -> list[sqlite3.Row]:
    conn = _connect()
    try:
        if query.strip():
            rows = conn.execute(
                """
                SELECT facts.id, facts.brain, facts.content, facts.source,
                       facts.created_at, facts.updated_at
                FROM facts_fts
                JOIN facts ON facts.id = facts_fts.rowid
                WHERE facts_fts MATCH ? AND facts.brain = ?
                ORDER BY rank
                LIMIT ?
                """,
                (query, brain, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, brain, content, source, created_at, updated_at "
                "FROM facts WHERE brain = ? ORDER BY updated_at DESC LIMIT ?",
                (brain, limit),
            ).fetchall()
        return rows
    finally:
        conn.close()


def correct(fact_id: int, new_content: str) -> bool:
    now = datetime.datetime.utcnow().isoformat()
    conn = _connect()
    try:
        cur = conn.execute(
            "UPDATE facts SET content = ?, updated_at = ? WHERE id = ?",
            (new_content, now, fact_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def forget(fact_id: int) -> bool:
    conn = _connect()
    try:
        cur = conn.execute("DELETE FROM facts WHERE id = ?", (fact_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def list_brains() -> list[str]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT DISTINCT brain FROM facts ORDER BY brain"
        ).fetchall()
        return [r["brain"] for r in rows]
    finally:
        conn.close()


def list_facts(brain: str, limit: int = 50) -> list[sqlite3.Row]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, brain, content, source, created_at, updated_at "
            "FROM facts WHERE brain = ? ORDER BY updated_at DESC LIMIT ?",
            (brain, limit),
        ).fetchall()
        return rows
    finally:
        conn.close()
