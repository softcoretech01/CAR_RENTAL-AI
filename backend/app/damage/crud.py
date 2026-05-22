"""
CRUD layer — every database operation is a stored-procedure call.
No raw SQL exists here; all SQL lives in database.py / MySQL.
"""
from __future__ import annotations
import json
import pymysql.connections

from app.database import row_to_dict


# ─── Internal helper ──────────────────────────────────────────────────────────

def _call_one(conn: pymysql.connections.Connection, sp: str, args: tuple = ()) -> dict | None:
    """Call a stored procedure and return the first (only) row, or None."""
    with conn.cursor() as cur:
        cur.execute(f"CALL {sp}({', '.join(['%s'] * len(args))})", args)
        row = cur.fetchone()
    return row_to_dict(row) if row else None


def _call_many(conn: pymysql.connections.Connection, sp: str, args: tuple = ()) -> list[dict]:
    """Call a stored procedure and return all rows."""
    with conn.cursor() as cur:
        cur.execute(f"CALL {sp}({', '.join(['%s'] * len(args))})", args)
        rows = cur.fetchall()
    return [row_to_dict(r) for r in rows]


# ─── Batch operations ─────────────────────────────────────────────────────────

def create_batch(conn, label: str | None) -> dict:
    return _call_one(conn, "sp_create_batch", (label,))


def get_batch(conn, batch_id: int) -> dict | None:
    return _call_one(conn, "sp_get_batch", (batch_id,))


def list_batches(conn, limit: int = 20, offset: int = 0) -> list[dict]:
    return _call_many(conn, "sp_list_batches", (limit, offset))


def refresh_batch_counts(conn, batch_id: int) -> dict | None:
    return _call_one(conn, "sp_refresh_batch_counts", (batch_id,))


# ─── Analysis operations ──────────────────────────────────────────────────────

def create_analysis(
    conn, *,
    image_path: str,
    original_name: str | None,
    source: str,
    status: str,
    confidence: float,
    severity: str,
    damage_types: list[str],
    region_description: str | None,
    explanation: str | None,
    is_flagged: bool,
    batch_id: int | None,
    bounding_boxes: list[list[float]] | None = None,
) -> dict:
    return _call_one(conn, "sp_create_analysis", (
        image_path,
        original_name,
        source,
        status,
        confidence,
        severity,
        json.dumps(damage_types),
        region_description,
        explanation,
        1 if is_flagged else 0,
        batch_id,
        json.dumps(bounding_boxes or []),
    ))


def get_analysis(conn, analysis_id: int) -> dict | None:
    return _call_one(conn, "sp_get_analysis", (analysis_id,))


def list_analyses(
    conn, *,
    status: str | None = None,
    severity: str | None = None,
    is_flagged: bool | None = None,
    batch_id: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    # Convert Python None/bool to MySQL-friendly values
    flagged_val = None if is_flagged is None else (1 if is_flagged else 0)
    return _call_many(conn, "sp_list_analyses", (
        status or "",
        severity or "",
        flagged_val,
        batch_id,
        limit,
        offset,
    ))


def update_feedback(conn, analysis_id: int, feedback: str) -> dict | None:
    return _call_one(conn, "sp_update_feedback", (analysis_id, feedback))


def delete_analysis(conn, analysis_id: int) -> tuple[int, str | None]:
    """Returns (rows_deleted, image_path_or_None)."""
    row = _call_one(conn, "sp_delete_analysis", (analysis_id,))
    if row is None:
        return 0, None
    return int(row.get("deleted", 0)), row.get("image_path")


# ─── Few-shot examples ────────────────────────────────────────────────────────

def get_few_shot_examples(conn, limit: int = 5) -> list[dict]:
    return _call_many(conn, "sp_get_few_shot_examples", (limit,))


# ─── Dashboard stats ──────────────────────────────────────────────────────────

def get_stats(conn) -> dict:
    """Aggregate dashboard stats — calls three stored procedures."""
    summary = _call_one(conn, "sp_get_summary_stats", ())
    flagged_items  = _call_many(conn, "sp_get_flagged_items",   (5,))
    incorrect_items = _call_many(conn, "sp_get_incorrect_items", (5,))

    return {
        "total":           int(summary.get("total", 0)          or 0),
        "damaged":         int(summary.get("damaged", 0)        or 0),
        "not_damaged":     int(summary.get("not_damaged", 0)    or 0),
        "uncertain":       int(summary.get("uncertain", 0)      or 0),
        "flagged":         int(summary.get("flagged", 0)        or 0),
        "correct":         int(summary.get("correct_count", 0)  or 0),
        "incorrect":       int(summary.get("incorrect_count", 0)or 0),
        "flagged_items":   flagged_items,
        "incorrect_items": incorrect_items,
    }
