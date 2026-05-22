"""Image I/O: resize with Pillow, save to storage, orchestrate AI call."""
from __future__ import annotations
import io, uuid
from pathlib import Path
from fastapi import UploadFile
from app.config import settings
from app.damage import ai_service

def _storage() -> Path:
    p = Path(settings.DAMAGE_STORAGE_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p

def _save(raw: bytes, original_name: str) -> tuple[str, Path]:
    suffix = Path(original_name).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = _storage() / filename
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw))
        max_px = settings.DAMAGE_IMAGE_MAX_PX
        if max(img.size) > max_px:
            img.thumbnail((max_px, max_px), Image.LANCZOS)
        buf = io.BytesIO()
        fmt = "JPEG" if suffix in (".jpg", ".jpeg") else "PNG"
        img.save(buf, format=fmt, quality=85)
        dest.write_bytes(buf.getvalue())
    except Exception:
        dest.write_bytes(raw)
    return filename, dest

def process_upload(upload: UploadFile, few_shots: list[dict] | None = None) -> tuple[dict, str]:
    raw = upload.file.read()
    media_type = upload.content_type or "image/jpeg"
    filename, full_path = _save(raw, upload.filename or "image.jpg")
    result = ai_service.analyse_bytes(full_path.read_bytes(), media_type, few_shots)
    return result, filename

def process_base64(data: str, name: str, few_shots: list[dict] | None = None) -> tuple[dict, str]:
    import base64, re
    if "," in data:
        header, b64 = data.split(",", 1)
        raw = base64.b64decode(b64)
    else:
        raw = base64.b64decode(data)
    filename, full_path = _save(raw, name)
    result = ai_service.analyse_bytes(full_path.read_bytes(), few_shots=few_shots)
    return result, filename

def delete_file(image_path: str) -> None:
    (_storage() / Path(image_path).name).unlink(missing_ok=True)

def is_flagged(confidence: float) -> bool:
    return confidence < settings.DAMAGE_CONFIDENCE_THRESHOLD
