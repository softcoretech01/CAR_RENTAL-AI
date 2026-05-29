"""
Image pipeline, comparison orchestration, and PDF report generation.
"""
from __future__ import annotations
import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from app.config import settings
from app.rental import ai_service


# ─── Storage paths ────────────────────────────────────────────────────────────

def _image_dir() -> Path:
    p = Path(settings.DAMAGE_STORAGE_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _report_dir() -> Path:
    p = Path(settings.DAMAGE_STORAGE_DIR).parent / "reports"
    p.mkdir(parents=True, exist_ok=True)
    return p


# ─── Image save + resize ──────────────────────────────────────────────────────

def save_image(raw: bytes, original_name: str) -> tuple[str, Path]:
    """Resize (if needed) and write image; return (filename, full_path)."""
    suffix = Path(original_name).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = _image_dir() / filename

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


async def save_upload(upload: UploadFile) -> tuple[str, Path]:
    """Read an UploadFile and persist it; return (filename, full_path)."""
    raw = await upload.read()
    return save_image(raw, upload.filename or "image.jpg")


def delete_image(image_path: str) -> None:
    (_image_dir() / Path(image_path).name).unlink(missing_ok=True)


# ─── Comparison orchestration ─────────────────────────────────────────────────

def run_comparison(
    conn,
    rental_id: int,
    pre_photos: list[dict],
    post_photos: list[dict],
) -> dict:
    """
    Compare all matching position photos.
    Returns comparison_result row dict.
    """
    from app.rental import crud

    # Index post photos by position_id
    post_by_pos: dict[int, dict] = {p["position_id"]: p for p in post_photos}
    pre_by_pos:  dict[int, dict] = {p["position_id"]: p for p in pre_photos}

    all_positions = set(pre_by_pos.keys()) | set(post_by_pos.keys())

    items: list[dict] = []
    damage_count = 0

    for pos_id in sorted(all_positions):
        pre  = pre_by_pos.get(pos_id)
        post = post_by_pos.get(pos_id)

        if pre is None or post is None:
            # Position only in one inspection → no_change
            items.append({
                "position_id":   pos_id,
                "pre_photo_id":  pre["id"] if pre else None,
                "post_photo_id": post["id"] if post else None,
                "status":        "no_change",
                "confidence":    100.0,
                "damage_types":  [],
                "explanation":   "Position only photographed once — no comparison possible.",
                "bounding_boxes": [],
            })
            continue

        # Both photos available — call AI
        try:
            before_path = _image_dir() / Path(pre["image_path"]).name
            after_path  = _image_dir() / Path(post["image_path"]).name
            before_bytes = before_path.read_bytes()
            after_bytes  = after_path.read_bytes()
            result = ai_service.compare_images(before_bytes, after_bytes)
        except Exception as exc:
            result = {
                "status":        "uncertain",
                "confidence":    0.0,
                "damage_types":  [],
                "explanation":   f"AI comparison failed: {exc}",
                "bounding_boxes": [],
            }

        if result["status"] == "new_damage":
            damage_count += 1

        items.append({
            "position_id":   pos_id,
            "pre_photo_id":  pre["id"],
            "post_photo_id": post["id"],
            **result,
        })

    # Overall status: any new_damage → damaged; all no_change → clean; else uncertain
    statuses = [i["status"] for i in items]
    if "new_damage" in statuses:
        overall = "damaged"
    elif all(s == "no_change" for s in statuses):
        overall = "clean"
    else:
        overall = "uncertain"

    # AI-generated overall summary (simple rule-based)
    if overall == "damaged":
        summary = f"New damage detected in {damage_count} position(s). Review the comparison items for details."
    elif overall == "clean":
        summary = "No new damage found. The vehicle was returned in the same condition."
    else:
        summary = "Some positions could not be assessed with certainty. Manual review recommended."

    comparison = crud.create_comparison_result(
        conn, rental_id=rental_id,
        overall_status=overall,
        damage_count=damage_count,
        summary=summary,
    )

    for item in items:
        crud.upsert_comparison_item(
            conn,
            comparison_id=comparison["id"],
            **item,
        )

    return comparison


# ─── PDF report ───────────────────────────────────────────────────────────────

def generate_pdf_report(rental: dict, comparison: dict,
                        items: list[dict]) -> Path:
    """Render an HTML report to PDF with weasyprint and save to storage/reports/."""
    from weasyprint import HTML

    html = _render_report_html(rental, comparison, items)
    report_filename = f"rental_{rental['id']}_report.pdf"
    report_path = _report_dir() / report_filename
    HTML(string=html, base_url=str(_image_dir())).write_pdf(str(report_path))
    return report_path


def _img_data_uri(image_path: str | None) -> str:
    """Convert stored image_path to base64 data URI for inline PDF embedding."""
    if not image_path:
        return ""
    try:
        full = _image_dir() / Path(image_path).name
        raw  = full.read_bytes()
        ext  = Path(image_path).suffix.lower()
        mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
        b64  = __import__("base64").standard_b64encode(raw).decode()
        return f"data:{mime};base64,{b64}"
    except Exception:
        return ""


def _status_label(status: str) -> str:
    return {"new_damage": "⚠ New Damage", "no_change": "✓ No Change",
            "uncertain": "? Uncertain"}.get(status, status.replace("_", " ").title())


def _verdict_color(status: str) -> str:
    return {"damaged": "#dc2626", "clean": "#16a34a", "uncertain": "#d97706"}.get(status, "#6b7280")


def _render_report_html(rental: dict, comparison: dict, items: list[dict]) -> str:
    vehicle_str = (
        f"{rental.get('year', '')} {rental.get('make', '')} {rental.get('model', '')} "
        f"({rental.get('color', '')}) — {rental.get('plate_number', '')}"
    ).strip()
    customer_str = rental.get("full_name", "—")
    verdict_label = {
        "clean": "Clean Return",
        "damaged": "Damage Found",
        "uncertain": "Uncertain — Manual Review Required",
    }.get(comparison.get("overall_status", "uncertain"), "Uncertain")
    verdict_color = _verdict_color(comparison.get("overall_status", "uncertain"))

    rows_html = ""
    for item in items:
        pre_uri  = _img_data_uri(item.get("pre_image_path"))
        post_uri = _img_data_uri(item.get("post_image_path"))
        pre_img  = f'<img src="{pre_uri}" style="width:100%;max-height:140px;object-fit:cover;border-radius:4px">' if pre_uri else "<em>No photo</em>"
        post_img = f'<img src="{post_uri}" style="width:100%;max-height:140px;object-fit:cover;border-radius:4px">' if post_uri else "<em>No photo</em>"
        status_label = _status_label(item.get("status", ""))
        row_color = "#fef2f2" if item.get("status") == "new_damage" else "white"
        dmg_types = ", ".join(item.get("damage_types") or []) or "—"
        explanation = item.get("explanation") or "—"

        verdict_td_color = '#dc2626' if item.get('status') == 'new_damage' else '#16a34a' if item.get('status') == 'no_change' else '#d97706'
        rows_html += f"""
        <tr style="background:{row_color}">
            <td style="font-weight:600">{item.get('position_name', '—')}</td>
            <td style="text-align:center">{pre_img}</td>
            <td style="text-align:center">{post_img}</td>
            <td style="font-weight:600;color:{verdict_td_color}">{status_label}</td>
            <td>{dmg_types}</td>
            <td>{explanation}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4 landscape; margin: 1.5cm; }}
  body {{ font-family: Arial, sans-serif; color: #1e293b; margin: 0; }}
  h1 {{ font-size: 20px; color: #1e293b; margin-bottom: 4px; }}
  .subtitle {{ color: #64748b; font-size: 12px; margin-bottom: 20px; }}
  .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }}
  .info-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }}
  .info-box h3 {{ font-size: 11px; text-transform: uppercase; color: #64748b; margin: 0 0 6px; }}
  .info-box p {{ margin: 2px 0; font-size: 12px; }}
  .verdict {{ background: {verdict_color}15; border: 2px solid {verdict_color};
              border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center; }}
  .verdict h2 {{ color: {verdict_color}; margin: 0; font-size: 18px; }}
  .verdict p {{ color: {verdict_color}; margin: 4px 0 0; font-size: 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }}
  col.c-pos    {{ width: 10%; }}
  col.c-img    {{ width: 18%; }}
  col.c-verdict {{ width: 11%; }}
  col.c-dmg    {{ width: 11%; }}
  col.c-ai     {{ width: 32%; }}
  th {{ background: #f1f5f9; padding: 8px 6px; text-align: left;
        border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; }}
  td {{ border-bottom: 1px solid #e2e8f0; vertical-align: top; padding: 6px; word-wrap: break-word; overflow-wrap: break-word; }}
  .footer {{ margin-top: 24px; text-align: center; color: #94a3b8; font-size: 10px; }}
</style>
</head>
<body>
<h1>🚗 Vehicle Damage Report</h1>
<p class="subtitle">Generated on {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

<div class="info-grid">
  <div class="info-box">
    <h3>Vehicle</h3>
    <p><strong>{vehicle_str}</strong></p>
    <p>Category: {rental.get('category','—').title()}</p>
  </div>
  <div class="info-box">
    <h3>Customer</h3>
    <p><strong>{customer_str}</strong></p>
    <p>Phone: {rental.get('phone','—')}</p>
    <p>ID / License: {rental.get('id_number','—')}</p>
  </div>
  <div class="info-box">
    <h3>Rental Period</h3>
    <p>Start: {rental.get('start_date','—')}</p>
    <p>Expected Return: {rental.get('expected_return_date','—')}</p>
    <p>Actual Return: {rental.get('actual_return_date') or '—'}</p>
  </div>
  <div class="info-box">
    <h3>Result Summary</h3>
    <p>Overall: <strong>{verdict_label}</strong></p>
    <p>Damage count: {comparison.get('damage_count', 0)} position(s)</p>
    <p>{comparison.get('summary','')}</p>
  </div>
</div>

<div class="verdict">
  <h2>{verdict_label}</h2>
  <p>{comparison.get('summary','')}</p>
</div>

<table>
  <colgroup>
    <col class="c-pos">
    <col class="c-img">
    <col class="c-img">
    <col class="c-verdict">
    <col class="c-dmg">
    <col class="c-ai">
  </colgroup>
  <thead>
    <tr>
      <th>Position</th>
      <th>Before</th>
      <th>After</th>
      <th>Verdict</th>
      <th>Damage Types</th>
      <th>AI Assessment</th>
    </tr>
  </thead>
  <tbody>
    {rows_html}
  </tbody>
</table>

<div class="footer">
  Car Rental Damage Detector &mdash; Rental #{rental.get('id', '—')}
</div>
</body>
</html>"""
