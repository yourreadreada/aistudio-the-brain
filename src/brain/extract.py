"""Pull plain text out of the file types college actually produces.

Text layer extraction, plus OCR on embedded images (scanned pages,
screenshot-style slides, labeled diagrams) — so a photo of a whiteboard or
a scanned handout isn't silently invisible to the brain. OCR only reads
text that's actually in the image; it won't describe a chart's shape or
what's in a photo. No layout preservation beyond "put a blank line between
natural sections" (pages, sheets, slides) so chunk_text()'s paragraph-based
splitting in ingest.py lands on sensible boundaries. Good enough for a V1
that's meant to be searchable, not a perfect reproduction of the original
document.
"""

from __future__ import annotations

import io
from pathlib import Path

SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf", ".docx", ".xlsx", ".pptx"}


def _ocr_image_bytes(data: bytes) -> str:
    """OCR one embedded image. Returns '' on anything that isn't readable
    text (a photo, a corrupt image, a logo) rather than raising — a bad or
    blank image should never stop the rest of the document from ingesting."""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(img).strip()
    except Exception:
        return ""


def extract_text(path: Path) -> str:
    """Return the file's content as plain text. Raises on unsupported types."""
    suffix = path.suffix.lower()

    if suffix in (".md", ".txt"):
        return path.read_text(encoding="utf-8", errors="ignore")

    if suffix == ".pdf":
        return _extract_pdf(path)

    if suffix == ".docx":
        return _extract_docx(path)

    if suffix == ".xlsx":
        return _extract_xlsx(path)

    if suffix == ".pptx":
        return _extract_pptx(path)

    raise ValueError(f"Unsupported file type: {suffix}")


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        parts = []
        text = (page.extract_text() or "").strip()
        if text:
            parts.append(text)

        for img in page.images:
            ocr_text = _ocr_image_bytes(img.data)
            if ocr_text:
                parts.append(f"[image text: {ocr_text}]")

        if parts:
            pages.append(f"## Page {i}\n\n" + "\n\n".join(parts))
    return "\n\n".join(pages)


def _extract_docx(path: Path) -> str:
    from docx import Document

    doc = Document(str(path))
    parts = []

    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text.strip())

    for t_idx, table in enumerate(doc.tables, start=1):
        rows = []
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                rows.append(" | ".join(cells))
        if rows:
            parts.append(f"## Table {t_idx}\n" + "\n".join(rows))

    img_idx = 0
    for rel in doc.part.rels.values():
        if "image" in rel.reltype:
            img_idx += 1
            ocr_text = _ocr_image_bytes(rel.target_part.blob)
            if ocr_text:
                parts.append(f"[image {img_idx} text: {ocr_text}]")

    return "\n\n".join(parts)


def _extract_xlsx(path: Path) -> str:
    from openpyxl import load_workbook

    wb = load_workbook(str(path), data_only=True, read_only=True)
    sheets = []

    for ws in wb.worksheets:
        rows = []
        for row in ws.iter_rows(values_only=True):
            cells = ["" if c is None else str(c) for c in row]
            if any(c.strip() for c in cells):
                rows.append(" | ".join(cells))
        if rows:
            sheets.append(f"## Sheet: {ws.title}\n" + "\n".join(rows))

    return "\n\n".join(sheets)


def _extract_pptx(path: Path) -> str:
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx import Presentation

    prs = Presentation(str(path))
    slides = []

    for i, slide in enumerate(prs.slides, start=1):
        lines = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                text = shape.text_frame.text.strip()
                if text:
                    lines.append(text)
            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                ocr_text = _ocr_image_bytes(shape.image.blob)
                if ocr_text:
                    lines.append(f"[image text: {ocr_text}]")
        if lines:
            slides.append(f"## Slide {i}\n" + "\n".join(lines))

    return "\n\n".join(slides)
