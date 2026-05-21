"""Provider-agnostic vision-based damage detection via OpenAI-compatible API."""
from __future__ import annotations
import base64, json, re
from openai import OpenAI
from app.config import settings

_PROMPT = """You are an expert damage-detection AI. Analyse the provided image and determine whether the object shown is damaged.

Respond with ONLY a valid JSON object — no markdown fences, no extra text:

{
  "status": "damaged" | "not_damaged" | "uncertain",
  "confidence": <integer 0-100>,
  "severity": "none" | "low" | "medium" | "high",
  "damage_types": [<array: "scratch","crack","dent","burn","corrosion","deformation","breakage","stain","tear","other">],
  "region_description": "<where damage is, or 'No damage detected'>",
  "explanation": "<2-3 sentence professional assessment>"
}

Rules:
- severity must be "none" when status is not "damaged"
- damage_types must be [] when status is not "damaged"
- confidence reflects certainty about status
- Be objective and professional."""

def _client() -> OpenAI:
    if not settings.AI_API_KEY:
        raise RuntimeError("AI_API_KEY not set in .env")
    return OpenAI(api_key=settings.AI_API_KEY, base_url=settings.AI_BASE_URL)

def analyse_bytes(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    safe_type = media_type if media_type in ("image/jpeg","image/png","image/gif","image/webp") else "image/jpeg"
    b64 = base64.standard_b64encode(image_bytes).decode()
    resp = _client().chat.completions.create(
        model=settings.AI_MODEL,
        max_tokens=512,
        messages=[{"role":"user","content":[
            {"type":"image_url","image_url":{"url":f"data:{safe_type};base64,{b64}"}},
            {"type":"text","text":_PROMPT}
        ]}]
    )
    return _parse(resp.choices[0].message.content.strip())

def analyse_base64(data: str) -> dict:
    if "," in data:
        header, b64 = data.split(",", 1)
        m = re.search(r"data:([^;]+);base64", header)
        return analyse_bytes(base64.b64decode(b64), m.group(1) if m else "image/jpeg")
    return analyse_bytes(base64.b64decode(data))

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
    return {
        "status": str(data.get("status","uncertain")).strip(),
        "confidence": max(0.0, min(100.0, float(data.get("confidence", 50)))),
        "severity": str(data.get("severity","none")).strip(),
        "damage_types": [str(v) for v in data.get("damage_types",[])] if isinstance(data.get("damage_types"), list) else [],
        "region_description": str(data.get("region_description","")).strip() or None,
        "explanation": str(data.get("explanation","")).strip() or None,
    }

def _fallback(reason: str) -> dict:
    return {"status":"uncertain","confidence":0.0,"severity":"none","damage_types":[],"region_description":None,"explanation":reason}
