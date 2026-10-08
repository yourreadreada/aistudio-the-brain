# brain

A local, multi-source memory that follows you across AI tools — so you stop
re-explaining the same project, the same topic, the same coding style to
Claude, GPT, Gemini, and whatever else, every time you switch.

This is **V1**: the smallest version of the idea that actually works end to
end. It does one thing — store facts, search them, correct them, and hand
them to any MCP-compatible AI tool — and does it locally, with nothing to
host and nothing to maintain.

## What's in V1

- **One local SQLite file** (`data/brain.db`) holds everything. No server to
  run, no account to create.
- **Brains are just a tag.** Call `remember(brain="coding", ...)` and a
  "coding" brain exists. Call it with `brain="college"` elsewhere and now
  there are two. Nothing to configure up front.
- **Full-text search** (SQLite FTS5) so `recall()` can actually find the
  relevant fact instead of returning everything.
- **Every fact remembers its source** (`claude`, `gpt`, `github`, `moodle`,
  whatever you tag it with), so you can always trace where something came
  from — the "receipts" idea.
- **Correction built in.** Any fact can be fixed with `correct(id, new text)`
  — either by telling the AI in conversation ("no, that's wrong, it's
  actually X" — the AI calls the tool for you) or by querying `recall()` /
  `list_facts()` yourself to see the ids and editing directly.
- **An ingest script** for bulk-loading files: drop markdown chat exports,
  PDFs, DOCX, XLSX or PPTX into `exports/<source-name>/` and run one command.

## What's deliberately NOT in V1

- **No acting.** Every tool here is read/write to *your own memory*, not to
  Gmail, Slack, GitHub, etc. The "read-first, act-second" idea means acting
  comes later, opt-in, per tool — not in the foundation.
- **No Moodle/Drive/GitHub live connectors.** Those are real integrations
  (OAuth, APIs) that deserve their own pass. V1 proves the core loop with
  manually-fed data first.
- ~~No color-coded UI~~ — added: `brain.web` now serves a live viewer with
  per-source clusters and click-to-correct.
- **No smart extraction.** Ingest just chunks raw text — it doesn't ask an
  LLM to pull out "the facts that matter." That's a good next upgrade, not a
  V1 requirement.

## Setup

```bash
cd brain
python3 -m venv .venv
./.venv/bin/pip install -e .
```

## Running it

As an MCP server (stdio transport — this is what Claude Desktop / Claude
Code will launch):

```bash
./.venv/bin/python -m brain.server
```

To connect it to **Claude Desktop** or **Claude Code**, add it to your MCP
config (usually `claude_desktop_config.json` or the equivalent for Claude
Code):

```json
{
  "mcpServers": {
    "brain": {
      "command": "/absolute/path/to/brain/.venv/bin/python",
      "args": ["-m", "brain.server"]
    }
  }
}
```

Restart the client, and it'll have four tools available: `remember`,
`recall`, `correct`, `forget`, and `list_brains`.

## Viewing and correcting it

Two viewers now exist, both reading/writing the same `brain.db` through the
same backend:

**Simple built-in viewer** — the per-source network visualization, no
install beyond the backend itself:

```bash
./.venv/bin/python -m brain.web
```

Open `http://localhost:8787`. Each AI source gets its own cluster around a
central hub, every fact is a node, click one to edit (`correct()`) or delete
(`forget()`) it.

**Full frontend** (`frontend/`) — a much more complete React app: pan/zoom
graph view, list view, global search, tags, a recent-activity log, an
"Add fact" / "Ingest" flow, and an MCP-bridge panel that generates the exact
Claude Desktop config for `brain.server`. This one started life as an
AI Studio prototype that was explicitly built to replicate another
product's look — it's been cleaned of that branding and copy, and its
storage layer now talks to this same Python backend (`brain.web`'s API)
instead of the browser's local storage, so this view and the MCP server see
identical data. Tags and the recent-activity log are still a local-only
convenience layer for now (not yet in the Python schema) — see "Where this
goes next."

To run it:

```bash
# terminal 1 — the backend, serves the API this frontend talks to
./.venv/bin/python -m brain.web

# terminal 2 — the frontend
cd frontend
npm install --legacy-peer-deps   # the pinned vite version needs this flag
npm run dev
```

Open the Vite dev server URL it prints (usually `http://localhost:3000`).
If the backend runs on a different host/port, copy `frontend/.env.local.example`
to `frontend/.env.local` and set `VITE_BRAIN_API_URL` accordingly.

## Loading files in — chats, and now college material

Supported file types: `.md`, `.txt`, `.pdf`, `.docx`, `.xlsx`, `.pptx`.
Anything else in a source folder is skipped with a note, not an error.
Each format's text layer gets extracted, and any embedded images (a
scanned page, a diagram, a photo of a whiteboard) get OCR'd too — so text
*inside* an image isn't invisible to the brain. OCR only reads text that's
actually in the image; it won't describe a chart's shape or what's in a
photo, and handwriting recognition is hit-or-miss. Tables come through as
pipe-separated rows, each PDF page / sheet / slide becomes its own chunk
boundary. See `extract.py` for exactly what each format does.

OCR needs the Tesseract binary installed on your system (not just the pip
package) — `sudo apt install tesseract-ocr` on Debian/Ubuntu, `brew install
tesseract` on macOS. Without it, everything else still works; image text
just won't get picked up.

1. Sort files into one folder per source — same idea whether it's an AI
   chat export or a Moodle download:

   ```
   exports/
     claude/
       project-x-planning.md
     gpt/
       project-x-debugging.md
     moodle/
       syllabus.pdf
       assignment-3.docx
       marks.xlsx
       lecture-12.pptx
   ```

2. Run:

   ```bash
   ./.venv/bin/python -m brain.ingest --source-dir ./exports --brain coding
   ```

   Everything gets extracted, chunked into facts, tagged with the folder
   name as its source (`claude`, `gpt`, `moodle`, ...), and stored in the
   brain you named. Run it again with `--brain college` for a different
   export set — e.g. point it at a `moodle/` folder full of downloaded
   course material.

## Project layout

```
brain/
  src/brain/
    db.py       # SQLite storage + full-text search
    server.py   # MCP server — the 5 tools an AI can call
    ingest.py   # bulk-load files (md/txt/pdf/docx/xlsx/pptx)
    extract.py  # per-format text extraction used by ingest.py
    web.py      # local viewer: serves the API + the page below
    static/
      index.html  # the brain visualization, wired to real data
  frontend/     # the full React app (see "Viewing and correcting it")
  data/
    brain.db    # created on first run, gitignore this
  requirements.txt
  pyproject.toml
```

## Where this goes next

Roughly in order of what'd matter most:

1. **Try it for real** — connect the MCP server to Claude, feed it a real
   project's exported chats, see where `recall()` actually falls short
   (probably: dumb chunking returns awkward fragments; worth an LLM pass to
   extract cleaner facts before storing).
2. **Live connectors** (GitHub first, probably — you already have an API
   token flow in your head from other projects) using read-first/act-second.
3. **Give tags and recent-activity a real backend home** — right now
   `frontend/src/services/brainStorage.ts` keeps those local-only
   (localStorage) since the Python schema has no columns for them yet. If
   they turn out to matter day to day, add a `tags` column and an
   `activity` table to `db.py` and move them over.
4. **Real image understanding, not just OCR** — a vision model call per
   embedded image (what's actually in a chart, a photo, a diagram) would
   go beyond reading text-in-images, at the cost of an API call per image.
   Worth it once OCR's limits actually start showing up, not before.
5. **Sort out `remember()`'s id handling** — the frontend does an
   optimistic local id, then reconciles it with the backend's real id once
   the POST resolves. Works, but a dedicated endpoint that returns the real
   id synchronously (rather than reading it back) would be cleaner.
