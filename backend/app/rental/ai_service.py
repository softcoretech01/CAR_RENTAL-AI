"""
Vehicle damage comparison AI service.
Sends before + after images to a vision model and determines
whether new damage appeared during the rental.
"""
from __future__ import annotations
import base64
import json
import re

from openai import OpenAI
from app.config import settings

_COMPARISON_PROMPT = """You are a professional vehicle damage inspector. You are given two photos of the same part of a car:
- BEFORE: taken before the rental
- AFTER: taken after the rental was returned

Determine whether NEW damage has appeared during the rental.

Respond with ONLY valid JSON — no markdown fences, no extra text:

{
  "status": "new_damage" | "no_change" | "uncertain",
  "confidence": <integer 0-100>,
  "damage_types": ["scratch","dent","crack","burn","stain","other"],
  "explanation": "<professional 2-3 sentence assessment>",
  "bounding_boxes": [[ymin, xmin, ymax, xmax]]
}

Rules:
- bounding_boxes are on the AFTER image only, as float percentages 0–100 (top-left origin)
- bounding_boxes must be [] if status is not "new_damage"
- damage_types must be [] if status is not "new_damage"
- Pre-existing damage visible in the BEFORE photo must NOT be flagged as new damage
- confidence reflects your certainty about the status verdict
- Be objective and professional"""


def _client() -> OpenAI:
    if not settings.AI_API_KEY:
        raise RuntimeError("AI_API_KEY not set in .env")
    return OpenAI(api_key=settings.AI_API_KEY, base_url=settings.AI_BASE_URL)


def compare_images(
    before_bytes: bytes,
    after_bytes: bytes,
    before_media_type: str = "image/jpeg",
    after_media_type: str = "image/jpeg",
) -> dict:
    """
    Compare before/after images for a single position.
    Returns a dict matching the AI schema above.
    """
    safe_before = _safe_type(before_media_type)
    safe_after  = _safe_type(after_media_type)

    b64_before = base64.standard_b64encode(before_bytes).decode()
    b64_after  = base64.standard_b64encode(after_bytes).decode()

    resp = _client().chat.completions.create(
        model=settings.AI_MODEL,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "BEFORE photo (taken before rental):"},
                {"type": "image_url", "image_url": {"url": f"data:{safe_before};base64,{b64_before}"}},
                {"type": "text", "text": "AFTER photo (taken after return):"},
                {"type": "image_url", "image_url": {"url": f"data:{safe_after};base64,{b64_after}"}},
                {"type": "text", "text": _COMPARISON_PROMPT},
            ],
        }],
    )
    return _parse(resp.choices[0].message.content.strip())


def _safe_type(media_type: str) -> str:
    return media_type if media_type in (
        "image/jpeg", "image/png", "image/gif", "image/webp"
    ) else "image/jpeg"


def _parse(text: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        try:
            data = json.loads(m.group(0)) if m else {}
        except Exception:
            return _fallback("Could not parse AI response")

    boxes: list[list[float]] = []
    if isinstance(data.get("bounding_boxes"), list):
        for box in data["bounding_boxes"]:
            if isinstance(box, list) and len(box) == 4:
                try:
                    boxes.append([float(c) for c in box])
                except (ValueError, TypeError):
                    pass

    status = str(data.get("status", "uncertain")).strip()
    return {
        "status":        status,
        "confidence":    max(0.0, min(100.0, float(data.get("confidence", 50)))),
        "damage_types":  [str(v) for v in data.get("damage_types", [])]
                         if isinstance(data.get("damage_types"), list) else [],
        "explanation":   str(data.get("explanation", "")).strip() or None,
        "bounding_boxes": boxes if status == "new_damage" else [],
    }


def _fallback(reason: str) -> dict:
    return {
        "status": "uncertain",
        "confidence": 0.0,
        "damage_types": [],
        "explanation": reason,
        "bounding_boxes": [],
    }
