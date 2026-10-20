from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import subprocess
import tempfile
import os
import uuid
import pymupdf
import gc

app = FastAPI()

SESSIONS = {}
TEMP_DIR = tempfile.mkdtemp(prefix="formulario_")


class FieldUpdate(BaseModel):
    name: str
    rect: list
    page: int = 0
    max_len: int = 0
    font_size: int = 10
    align: str = "left"
    type_input: str = "text"
    show_lines: bool = True


class SessionUpdate(BaseModel):
    updates: List[FieldUpdate]


def merge_close_fields(fields):
    if not fields:
        return fields

    merged_result = []
    pages = {}
    for f in fields:
        pages.setdefault(f["page"], []).append(f)

    for page_num, page_fields in pages.items():
        page_fields.sort(key=lambda f: (round(f["rect"][1], 1), f["rect"][0]))
        consumed = set()
        new_page_fields = []

        for i, f1 in enumerate(page_fields):
            if i in consumed:
                continue

            r1 = f1["rect"]
            current_merged = f1.copy()

            for j in range(i + 1, len(page_fields)):
                if j in consumed:
                    continue

                f2 = page_fields[j]
                r2 = f2["rect"]
                y_overlap = min(r1[3], r2[3]) - max(r1[1], r2[1])
                h1, h2 = r1[3] - r1[1], r2[3] - r2[1]

                if y_overlap > 0.5 * min(h1, h2):
                    gap = r2[0] - current_merged["rect"][2]
                    if -5 <= gap <= 30:
                        current_merged["rect"] = [
                            current_merged["rect"][0],
                            min(current_merged["rect"][1], r2[1]),
                            max(current_merged["rect"][2], r2[2]),
                            max(current_merged["rect"][3], r2[3]),
                        ]
                        if (
                            current_merged["type"] == "Text"
                            and f2["type"] == "Text"
                        ):
                            current_merged["max_len"] = (
                                current_merged.get("max_len", 0) or 0
                            ) + (f2.get("max_len", 0) or 0)
                        consumed.add(j)
            new_page_fields.append(current_merged)

        merged_result.extend(new_page_fields)

    return merged_result


def add_custom_fields(doc):
    custom_fields = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("dict")
        for block in text.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    txt = span["text"].strip()
                    if len(txt) >= 3 and all(c in "._| " for c in txt):
                        bbox = list(span["bbox"])
                        if bbox[2] - bbox[0] > 20:
                            bbox[1] -= 4
                            bbox[3] += 8
                            widget = pymupdf.Widget()
                            widget.field_name = (
                                f"auto_{page_num}_{int(bbox[0])}_{int(bbox[1])}"
                            )
                            widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
                            widget.rect = pymupdf.Rect(bbox)
                            page.add_widget(widget)
                            custom_fields.append(
                                {
                                    "page": page_num,
                                    "name": widget.field_name,
                                    "type": "Text",
                                    "rect": list(bbox),
                                    "max_len": 0,
                                    "value": "",
                                    "show_lines": False,
                                }
                            )
        for path in page.get_drawings():
            if path.get("dashes") == "d" or path.get("dashes") == "D":
                rect = path["rect"]
                if rect.width > 30 and rect.height < 10:
                    widget = pymupdf.Widget()
                    widget.field_name = (
                        f"auto_line_{page_num}_{int(rect.x0)}_{int(rect.y0)}"
                    )
                    widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
                    widget.rect = pymupdf.Rect(
                        rect.x0, rect.y0 - 5, rect.x1, rect.y1 + 5
                    )
                    page.add_widget(widget)
                    custom_fields.append(
                        {
                            "page": page_num,
                            "name": widget.field_name,
                            "type": "Text",
                            "rect": list(widget.rect),
                            "max_len": 0,
                            "value": "",
                            "show_lines": False,
                        }
                    )
    return custom_fields


@app.post("/api/process")
async def process_pdf(file: UploadFile = File(...)):
    try:
        session_id = str(uuid.uuid4())
        input_path = os.path.join(TEMP_DIR, f"{session_id}_input.pdf")
        output_path = os.path.join(TEMP_DIR, f"{session_id}_fillable.pdf")

        with open(input_path, "wb") as f:
            f.write(await file.read())

        result = subprocess.run(
            ["commonforms", "--model", "FFDNet-S", input_path, output_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise Exception(f"Fallo el modelo IA: {result.stderr}")

        doc = pymupdf.open(output_path)
        fields = []
        for page_num in range(len(doc)):
            for widget in doc[page_num].widgets():
                fields.append(
                    {
                        "page": page_num,
                        "name": widget.field_name,
                        "type": widget.field_type_string,
                        "rect": list(widget.rect),
                        "max_len": getattr(widget, "text_maxlen", 0) or 0,
                        "value": widget.field_value or "",
                        "show_lines": False,
                    }
                )

        fields.extend(add_custom_fields(doc))
        fields = merge_close_fields(fields)

        doc.save(output_path, incremental=True, encryption=pymupdf.PDF_ENCRYPT_KEEP)
        doc.close()
        gc.collect()

        SESSIONS[session_id] = {
            "input": input_path,
            "output": output_path,
            "fields": fields,
        }
        return {
            "session_id": session_id,
            "fields": fields,
            "pdf_url": f"/api/session/{session_id}/pdf",
        }
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/pdf")
async def get_session_pdf(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    return FileResponse(SESSIONS[session_id]["output"], media_type="application/pdf")


@app.post("/api/session/{session_id}/update")
async def update_fields(session_id: str, data: SessionUpdate):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    output_path = SESSIONS[session_id]["output"]
    doc = pymupdf.open(output_path)
    updates = {u.name: u for u in data.updates}
    processed_names = set()
    align_map = {"left": 0, "center": 1, "right": 2}

    for page_num in range(len(doc)):
        page = doc[page_num]
        for widget in page.widgets():
            if widget.field_name in updates:
                u = updates[widget.field_name]
                r = u.rect
                widget.rect = pymupdf.Rect(r[0], r[1], r[2], r[3])

                if u.font_size:
                    widget.text_fontsize = u.font_size

                if u.align in align_map:
                    widget.text_align = align_map[u.align]

                if u.max_len > 0:
                    widget.text_maxlen = u.max_len
                    if u.show_lines:
                        widget.field_flags |= pymupdf.PDF_TX_FIELD_IS_COMB
                        widget.border_color = (0, 0, 0)
                        widget.border_width = 1
                    else:
                        widget.field_flags &= ~pymupdf.PDF_TX_FIELD_IS_COMB
                        widget.border_width = 0

                    auto_font = (r[2] - r[0]) / (u.max_len * 5.5)
                    if not u.font_size:
                        widget.text_fontsize = max(6, min(14, auto_font))
                else:
                    widget.text_maxlen = 0
                    widget.field_flags &= ~pymupdf.PDF_TX_FIELD_IS_COMB

                widget.update()
                processed_names.add(widget.field_name)

    for u in data.updates:
        if u.name not in processed_names:
            page = doc[u.page]
            widget = pymupdf.Widget()
            widget.field_name = u.name
            widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
            r = u.rect
            widget.rect = pymupdf.Rect(r[0], r[1], r[2], r[3])

            if u.font_size:
                widget.text_fontsize = u.font_size

            if u.align in align_map:
                widget.text_align = align_map[u.align]

            if u.max_len > 0:
                widget.text_maxlen = u.max_len
                if u.show_lines:
                    widget.field_flags |= pymupdf.PDF_TX_FIELD_IS_COMB

            page.add_widget(widget)

    tmp_path = output_path + ".tmp"
    doc.save(tmp_path)
    doc.close()
    os.replace(tmp_path, output_path)
    return {"status": "ok", "updated": len(data.updates)}


@app.get("/api/session/{session_id}/download")
async def download_pdf(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    return FileResponse(
        SESSIONS[session_id]["output"],
        media_type="application/pdf",
        filename="formulario_ajustado.pdf",
    )
