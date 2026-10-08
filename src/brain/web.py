"""A tiny local web viewer for the brain.

No framework, no extra dependency — just Python's stdlib http.server. Serves:

  GET  /                       -> the viewer page (static/index.html)
  GET  /api/brains             -> ["coding", "college", ...]
  GET  /api/facts?brain=coding -> [{id, brain, content, source, created_at, updated_at}, ...]
  POST /api/correct            -> body {"id": 7, "content": "..."} -> updates a fact
  POST /api/forget             -> body {"id": 7} -> deletes a fact

This is read/write to your own local brain.db only — nothing leaves your
machine. Run it, then open http://localhost:8787 in a browser.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from . import db

STATIC_DIR = Path(__file__).resolve().parent / "static"


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        # Local-only server, but the React dev server (Vite, a different
        # port) needs CORS to fetch it from the browser.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):  # noqa: N802 - CORS preflight
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, content_type: str):
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    def log_message(self, format, *args):  # noqa: A002 - quiet default logging
        pass

    def do_GET(self):  # noqa: N802 - http.server's naming convention
        parsed = urlparse(self.path)

        if parsed.path == "/":
            self._send_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return

        if parsed.path == "/api/brains":
            self._send_json(db.list_brains())
            return

        if parsed.path == "/api/facts":
            qs = parse_qs(parsed.query)
            brain = (qs.get("brain") or [""])[0]
            if not brain:
                self._send_json({"error": "missing ?brain="}, status=400)
                return
            rows = db.list_facts(brain=brain, limit=1000)
            self._send_json([dict(r) for r in rows])
            return

        self._send_json({"error": "not found"}, status=404)

    def do_POST(self):  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path == "/api/remember":
            body = self._read_json_body()
            brain = (body.get("brain") or "").strip()
            content = (body.get("content") or "").strip()
            source = (body.get("source") or "").strip()
            file_name = body.get("file_name")
            file_path = body.get("file_path")
            if not brain or not content or not source:
                self._send_json({"error": "brain, content and source required"}, status=400)
                return
            fact_id = db.remember(brain=brain, content=content, source=source, file_name=file_name, file_path=file_path)
            rows = db.recall(brain=brain, query="", limit=1000)
            saved = next((dict(r) for r in rows if r["id"] == fact_id), None)
            self._send_json(saved or {"id": fact_id})
            return

        if parsed.path == "/api/check_file":
            body = self._read_json_body()
            brain = (body.get("brain") or "").strip()
            file_path = (body.get("file_path") or body.get("file_name") or "").strip()
            content = (body.get("content") or "").strip()
            if not brain or not file_path:
                self._send_json({"error": "brain and file_path required"}, status=400)
                return
            existing = db.find_by_file(brain=brain, file_path_or_name=file_path)
            if not existing:
                self._send_json({"exists": False, "is_identical": False})
                return
            existing_dict = dict(existing)
            is_identical = (existing_dict.get("content") or "").strip() == content
            self._send_json({
                "exists": True,
                "fact": existing_dict,
                "is_identical": is_identical,
            })
            return

        if parsed.path == "/api/ingest":
            body = self._read_json_body()
            brain = (body.get("brain") or "").strip()
            content = (body.get("content") or "").strip()
            source = (body.get("source") or "").strip()
            file_name = (body.get("file_name") or "document.md").strip()
            file_path = (body.get("file_path") or file_name).strip()
            if not brain or not content or not source:
                self._send_json({"error": "brain, content and source required"}, status=400)
                return
            fact_id, action = db.remember_or_merge_file(
                brain=brain,
                content=content,
                source=source,
                file_name=file_name,
                file_path=file_path,
            )
            rows = db.recall(brain=brain, query="", limit=1000)
            saved = next((dict(r) for r in rows if r["id"] == fact_id), None)
            self._send_json({
                "fact": saved or {"id": fact_id},
                "action": action,
                "message": f"Successfully {action} file node #{fact_id}",
            })
            return

        if parsed.path == "/api/correct":
            body = self._read_json_body()
            fact_id = body.get("id")
            content = body.get("content", "")
            if fact_id is None or not content.strip():
                self._send_json({"error": "id and content required"}, status=400)
                return
            ok = db.correct(fact_id=int(fact_id), new_content=content)
            self._send_json({"ok": ok})
            return

        if parsed.path == "/api/forget":
            body = self._read_json_body()
            fact_id = body.get("id")
            if fact_id is None:
                self._send_json({"error": "id required"}, status=400)
                return
            ok = db.forget(fact_id=int(fact_id))
            self._send_json({"ok": ok})
            return

        self._send_json({"error": "not found"}, status=404)


def main(port: int = 8787) -> None:
    db.init_db()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Brain viewer running at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
