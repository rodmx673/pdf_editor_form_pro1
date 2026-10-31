from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import subprocess
import os
import uuid
import pymupdf
import gc
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CONFIGURACIÓN PERSISTENTE ──
TEMP_DIR = os.path.join(os.getcwd(), "temp_formularios")
os.makedirs(TEMP_DIR, exist_ok=True)
SESSIONS_FILE = os.path.join(TEMP_DIR, "sessions.json")

if os.path.exists(SESSIONS_FILE):
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            SESSIONS = json.load(f)
    except:
        SESSIONS = {}
else:
    SESSIONS = {}

def save_sessions():
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(SESSIONS, f)
# ───────────────────────────────

class FieldUpdate(BaseModel):
    name: str
    rect: list
    page: int = 0
    max_len: int = 0
    font_size: int = 10
    align: str = "left"
    type_input: str = "text"
    value: str = ""
    checked: bool = False

class SessionUpdate(BaseModel):
    updates: List[FieldUpdate]

def analyze_pdf_quality(doc):
    try:
        page = doc[0]
        text = page.get_text().strip()
        images = page.get_images(full=True)
        if len(text) > 50: return {"status": "optimal", "dpi": 300, "msg": "Documento digital. Calidad Óptima."}
        if images:
            largest_img = max(images, key=lambda img: img[2] * img[3]) 
            xref = largest_img[0]
            img_info = doc.extract_image(xref)
            img_width = img_info["width"]
            page_width_inches = page.rect.width / 72
            dpi = int(img_width / page_width_inches) if page_width_inches > 0 else 0
            if dpi < 100: return {"status": "low", "dpi": dpi, "msg": f"Escaneo de baja resolución ({dpi} DPI)."}
            elif dpi < 200: return {"status": "medium", "dpi": dpi, "msg": f"Escaneo de resolución media ({dpi} DPI)."}
            else: return {"status": "high", "dpi": dpi, "msg": f"Escaneo de alta resolución ({dpi} DPI)."}
        return {"status": "unknown", "dpi": 0, "msg": "Análisis no disponible."}
    except Exception as e:
        return {"status": "unknown", "dpi": 0, "msg": "Análisis no disponible."}

@app.post("/api/analyze")
async def analyze_pdf(file: UploadFile = File(...)):
    try:
        session_id = str(uuid.uuid4())
        input_path = os.path.join(TEMP_DIR, f"{session_id}_input.pdf")
        with open(input_path, "wb") as f:
            f.write(await file.read())
        doc = pymupdf.open(input_path)
        quality_info = analyze_pdf_quality(doc)
        doc.close()
        gc.collect()
        SESSIONS[session_id] = {"input": input_path}
        save_sessions()
        return {"session_id": session_id, "quality": quality_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al leer el PDF.")

@app.post("/api/process/{session_id}")
async def process_pdf(session_id: str):
    try:
        if session_id not in SESSIONS: raise HTTPException(status_code=404, detail="Sesión no encontrada")
        input_path = SESSIONS[session_id]["input"]
        output_path = os.path.join(TEMP_DIR, f"{session_id}_fillable.pdf")
        
        result = subprocess.run(["commonforms", "--model", "FFDNet-S", input_path, output_path], capture_output=True, text=True, timeout=600)
        if result.returncode != 0: raise Exception(f"Fallo IA: {result.stderr}")
        
        doc = pymupdf.open(output_path)
        fields = []
        for page_num in range(len(doc)):
            for widget in doc[page_num].widgets():
                fields.append({
                    "page": page_num, "name": widget.field_name, "type": widget.field_type_string,
                    "rect": list(widget.rect), "max_len": getattr(widget, "text_maxlen", 0) or 0,
                    "value": widget.field_value if isinstance(widget.field_value, str) else "",
                    "checked": bool(widget.field_value) if isinstance(widget.field_value, bool) else False
                })
        doc.save(output_path, incremental=True, encryption=pymupdf.PDF_ENCRYPT_KEEP)
        doc.close()
        gc.collect()
        SESSIONS[session_id]["output"] = output_path
        save_sessions()
        return {"session_id": session_id, "fields": fields, "pdf_url": f"/api/session/{session_id}/pdf"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/{session_id}/pdf")
async def get_session_pdf(session_id: str):
    if session_id not in SESSIONS or "output" not in SESSIONS[session_id]: raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return FileResponse(SESSIONS[session_id]["output"], media_type="application/pdf")

@app.post("/api/session/{session_id}/update")
async def update_fields(session_id: str, data: SessionUpdate):
    if session_id not in SESSIONS or "output" not in SESSIONS[session_id]: raise HTTPException(status_code=404, detail="Sesión no encontrada")
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
                if widget.field_type_string in ["CheckBox", "RadioButton"]:
                    widget.border_width = 0; widget.fill_color = None
                    w = r[2] - r[0]; h = r[3] - r[1]; size = min(w, h, 15) 
                    cx = (r[0] + r[2]) / 2; cy = (r[1] + r[3]) / 2
                    widget.rect = pymupdf.Rect(cx - size/2, cy - size/2, cx + size/2, cy + size/2)
                    widget.field_value = u.checked
                else:
                    height = r[3] - r[1]
                    if height < 15: r[1] -= 5; r[3] += 5
                    widget.rect = pymupdf.Rect(r[0], r[1], r[2], r[3])
                    if u.value is not None: 
                        widget.field_value = str(u.value).replace(" ", "") if u.max_len > 0 else str(u.value)
                    if u.align in align_map: widget.text_align = align_map[u.align]
                    if u.max_len > 0:
                        widget.text_maxlen = u.max_len; widget.text_font = "Helv"; widget.text_align = 1 
                        widget.field_flags |= pymupdf.PDF_TX_FIELD_IS_COMB; widget.border_color = None
                        widget.border_width = 0; widget.fill_color = None
                        widget.text_fontsize = u.font_size if u.font_size else 10.0 
                    else:
                        widget.text_maxlen = 0; widget.field_flags &= ~pymupdf.PDF_TX_FIELD_IS_COMB
                        widget.border_width = 0; widget.fill_color = None
                        if u.font_size: widget.text_fontsize = u.font_size
                widget.update()
                processed_names.add(widget.field_name)

    for u in data.updates:
        if u.name not in processed_names:
            page = doc[u.page]
            widget = pymupdf.Widget()
            widget.field_name = u.name
            r = u.rect
            if u.type_input == "checkbox":
                widget.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
                widget.border_width = 0; widget.fill_color = None
                w = r[2] - r[0]; h = r[3] - r[1]; size = min(w, h, 15) 
                cx = (r[0] + r[2]) / 2; cy = (r[1] + r[3]) / 2
                widget.rect = pymupdf.Rect(cx - size/2, cy - size/2, cx + size/2, cy + size/2)
                widget.field_value = u.checked
            else:
                widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
                height = r[3] - r[1]
                if height < 15: r[1] -= 5; r[3] += 5
                widget.rect = pymupdf.Rect(r[0], r[1], r[2], r[3])
                if u.value is not None: 
                    widget.field_value = str(u.value).replace(" ", "") if u.max_len > 0 else str(u.value)
                if u.align in align_map: widget.text_align = align_map[u.align]
                if u.max_len > 0:
                    widget.text_maxlen = u.max_len; widget.text_font = "Helv"; widget.text_align = 1
                    widget.field_flags |= pymupdf.PDF_TX_FIELD_IS_COMB; widget.border_color = None
                    widget.border_width = 0; widget.fill_color = None
                    widget.text_fontsize = u.font_size if u.font_size else 10.0
                else:
                    if u.font_size: widget.text_fontsize = u.font_size
            page.add_widget(widget)

    tmp_path = output_path + ".tmp"
    doc.save(tmp_path)
    doc.close()
    os.replace(tmp_path, output_path)
    return {"status": "ok", "updated": len(data.updates)}

@app.get("/api/session/{session_id}/download")
async def download_pdf(session_id: str, sealed: bool = False):
    if session_id not in SESSIONS or "output" not in SESSIONS[session_id]: raise HTTPException(status_code=404, detail="Sesión no encontrada")
    output_path = SESSIONS[session_id]["output"]
    if sealed:
        doc = pymupdf.open(output_path)
        for page in doc:
            for widget in page.widgets(): widget.update()
        doc.bake()
        sealed_path = output_path.replace(".pdf", "_sellado.pdf")
        doc.save(sealed_path)
        doc.close()
        return FileResponse(sealed_path, media_type="application/pdf", filename="formulario_sellado.pdf")
    return FileResponse(output_path, media_type="application/pdf", filename="formulario_lleno.pdf")
