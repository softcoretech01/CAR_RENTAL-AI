import json
import sqlite3
from app.database import row_to_dict

def create_batch(conn: sqlite3.Connection, label: str | None) -> dict:
    cur = conn.execute(
        "INSERT INTO damage_batches (label) VALUES (?)", (label,)
    )
    row = conn.execute("SELECT * FROM damage_batches WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)

def get_batch(conn: sqlite3.Connection, batch_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM damage_batches WHERE id = ?", (batch_id,)).fetchone()
    return row_to_dict(row) if row else None

def list_batches(conn: sqlite3.Connection, limit: int = 20, offset: int = 0) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM damage_batches ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    return [row_to_dict(r) for r in rows]

def refresh_batch_counts(conn: sqlite3.Connection, batch_id: int) -> dict | None:
    conn.execute("""
        UPDATE damage_batches SET
            total_count       = (SELECT COUNT(*) FROM damage_analyses WHERE batch_id = ?),
            damaged_count     = (SELECT COUNT(*) FROM damage_analyses WHERE batch_id = ? AND status = 'damaged'),
            not_damaged_count = (SELECT COUNT(*) FROM damage_analyses WHERE batch_id = ? AND status = 'not_damaged'),
            flagged_count     = (SELECT COUNT(*) FROM damage_analyses WHERE batch_id = ? AND is_flagged = 1)
        WHERE id = ?
    """, (batch_id, batch_id, batch_id, batch_id, batch_id))
    return get_batch(conn, batch_id)

def create_analysis(conn: sqlite3.Connection, *, image_path: str, original_name: str | None,
                    source: str, status: str, confidence: float, severity: str,
                    damage_types: list[str], region_description: str | None,
                    explanation: str | None, is_flagged: bool,
                    batch_id: int | None) -> dict:
    cur = conn.execute("""
        INSERT INTO damage_analyses
            (image_path, original_name, source, status, confidence, severity,
             damage_types, region_description, explanation, is_flagged, batch_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (image_path, original_name, source, status, confidence, severity,
          json.dumps(damage_types), region_description, explanation,
          1 if is_flagged else 0, batch_id))
    row = conn.execute("SELECT * FROM damage_analyses WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)

def get_analysis(conn: sqlite3.Connection, analysis_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM damage_analyses WHERE id = ?", (analysis_id,)).fetchone()
    return row_to_dict(row) if row else None

def list_analyses(conn: sqlite3.Connection, *, status: str | None = None,
                  severity: str | None = None, is_flagged: bool | None = None,
                  batch_id: int | None = None, limit: int = 20, offset: int = 0) -> list[dict]:
    conditions, params = [], []
    if status: conditions.append("status = ?"); params.append(status)
    if severity: conditions.append("severity = ?"); params.append(severity)
    if is_flagged is not None: conditions.append("is_flagged = ?"); params.append(1 if is_flagged else 0)
    if batch_id is not None: conditions.append("batch_id = ?"); params.append(batch_id)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = conn.execute(
        f"SELECT * FROM damage_analyses {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    return [row_to_dict(r) for r in rows]

def update_feedback(conn: sqlite3.Connection, analysis_id: int, feedback: str) -> dict | None:
    conn.execute("UPDATE damage_analyses SET user_feedback = ? WHERE id = ?", (feedback, analysis_id))
    return get_analysis(conn, analysis_id)

def delete_analysis(conn: sqlite3.Connection, analysis_id: int) -> tuple[int, str | None]:
    row = conn.execute("SELECT image_path FROM damage_analyses WHERE id = ?", (analysis_id,)).fetchone()
    if not row:
        return 0, None
    image_path = row["image_path"]
    conn.execute("DELETE FROM damage_analyses WHERE id = ?", (analysis_id,))
    return 1, image_path
