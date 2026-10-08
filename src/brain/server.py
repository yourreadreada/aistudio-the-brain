"""The brain, exposed over MCP.

Run this and point an MCP-compatible tool (Claude Desktop, Claude Code, etc.)
at it. It gives the AI four tools: remember, recall, correct, and
list_brains/list_facts — the minimum needed for "store context, retrieve
context, fix context when it's wrong."

Everything is read/write to the same local SQLite file, so this is
single-user and local by design for now. No network exposure, nothing to
host.
"""

from __future__ import annotations

from mcp.server.mcpserver import MCPServer

from . import db

mcp = MCPServer("brain")


@mcp.tool()
def remember(brain: str, content: str, source: str) -> str:
    """Store a fact in a given brain.

    Args:
        brain: which brain this belongs to, e.g. "coding", "college", "personal".
               Brains are created implicitly — just use a new name.
        content: the fact itself, written plainly, e.g.
                 "Dog translator project moved from heuristic rules to a real ML model."
        source: where this came from, e.g. "claude", "gpt", "gemini", "github", "moodle".
    """
    fact_id = db.remember(brain=brain, content=content, source=source)
    return f"Stored fact #{fact_id} in brain '{brain}' (source: {source})."


@mcp.tool()
def recall(brain: str, query: str = "", limit: int = 10) -> str:
    """Retrieve facts from a brain, optionally filtered by a search query.

    Args:
        brain: which brain to search, e.g. "coding".
        query: keywords to search for. Leave empty to get the most recent facts.
        limit: max number of facts to return.
    """
    rows = db.recall(brain=brain, query=query, limit=limit)
    if not rows:
        return f"No facts found in brain '{brain}' for query '{query}'."
    lines = [
        f"[#{r['id']} | {r['source']} | {r['updated_at']}] {r['content']}"
        for r in rows
    ]
    return "\n".join(lines)


@mcp.tool()
def correct(fact_id: int, new_content: str) -> str:
    """Correct a previously stored fact.

    Args:
        fact_id: the # shown in recall() output, e.g. 7 for "[#7 | claude | ...]".
        new_content: the corrected version of the fact.
    """
    ok = db.correct(fact_id=fact_id, new_content=new_content)
    if ok:
        return f"Fact #{fact_id} corrected."
    return f"No fact found with id {fact_id}."


@mcp.tool()
def forget(fact_id: int) -> str:
    """Delete a stored fact entirely.

    Args:
        fact_id: the # shown in recall() output.
    """
    ok = db.forget(fact_id=fact_id)
    if ok:
        return f"Fact #{fact_id} deleted."
    return f"No fact found with id {fact_id}."


@mcp.tool()
def list_brains() -> str:
    """List every brain that currently has at least one fact stored."""
    brains = db.list_brains()
    if not brains:
        return "No brains yet — nothing has been stored."
    return "\n".join(brains)


def main() -> None:
    db.init_db()
    mcp.run()


if __name__ == "__main__":
    main()
