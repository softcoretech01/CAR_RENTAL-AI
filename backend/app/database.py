"""
MySQL database layer using PyMySQL.
All SQL lives in stored procedures defined here — the application
calls CALL sp_name(...) and never writes raw SQL itself.
"""
from __future__ import annotations
import json
from contextlib import contextmanager
from datetime import datetime

import pymysql
import pymysql.cursors

from app.config import settings

# ─── Connection factory ────────────────────────────────────────────────────────

def _connect() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASS,
        database=settings.DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
        charset="utf8mb4",
    )


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─── Row helpers ──────────────────────────────────────────────────────────────

def row_to_dict(row: dict | None) -> dict | None:
    """Normalise a DictCursor row: parse JSON fields, booleans, datetimes."""
    if row is None:
        return None
    d = dict(row)

    for field in ("damage_types", "bounding_boxes"):
        if field in d:
            val = d[field]
            if val is None:
                d[field] = []
            elif isinstance(val, str):
                try:
                    d[field] = json.loads(val)
                except Exception:
                    d[field] = []
            # MySQL JSON columns may already be parsed by PyMySQL — leave lists alone
            elif not isinstance(val, list):
                d[field] = []

    if "is_flagged" in d:
        d["is_flagged"] = bool(d["is_flagged"])

    # Convert datetime objects → ISO string (Pydantic schema expects str)
    if "created_at" in d:
        v = d["created_at"]
        if isinstance(v, datetime):
            d["created_at"] = v.strftime("%Y-%m-%d %H:%M:%S")

    return d


# ─── Schema + stored procedures ───────────────────────────────────────────────

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS damage_batches (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    label             VARCHAR(500),
    total_count       INT NOT NULL DEFAULT 0,
    damaged_count     INT NOT NULL DEFAULT 0,
    not_damaged_count INT NOT NULL DEFAULT 0,
    flagged_count     INT NOT NULL DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS damage_analyses (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    image_path         VARCHAR(500) NOT NULL,
    original_name      VARCHAR(255),
    source             VARCHAR(50)  NOT NULL DEFAULT 'upload',
    status             VARCHAR(50)  NOT NULL,
    confidence         DOUBLE       NOT NULL,
    severity           VARCHAR(50)  NOT NULL DEFAULT 'none',
    damage_types       JSON         NOT NULL,
    region_description TEXT,
    explanation        TEXT,
    is_flagged         TINYINT(1)   NOT NULL DEFAULT 0,
    batch_id           INT,
    user_feedback      VARCHAR(50),
    bounding_boxes     JSON         NOT NULL,
    created_at         DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES damage_batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

# Each procedure is a (name, body) pair.  We DROP IF EXISTS before re-creating
# so init_db() is idempotent on every restart.
_STORED_PROCEDURES: list[tuple[str, str]] = [

    # ── Batches ────────────────────────────────────────────────────────────────

    ("sp_create_batch", """
        CREATE PROCEDURE sp_create_batch(IN p_label VARCHAR(500))
        BEGIN
            INSERT INTO damage_batches (label) VALUES (p_label);
            SELECT * FROM damage_batches WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_get_batch", """
        CREATE PROCEDURE sp_get_batch(IN p_id INT)
        BEGIN
            SELECT * FROM damage_batches WHERE id = p_id;
        END
    """),

    ("sp_list_batches", """
        CREATE PROCEDURE sp_list_batches(IN p_limit INT, IN p_offset INT)
        BEGIN
            SELECT * FROM damage_batches
            ORDER BY created_at DESC
            LIMIT p_limit OFFSET p_offset;
        END
    """),

    ("sp_refresh_batch_counts", """
        CREATE PROCEDURE sp_refresh_batch_counts(IN p_id INT)
        BEGIN
            UPDATE damage_batches SET
                total_count       = (SELECT COUNT(*)
                                     FROM damage_analyses WHERE batch_id = p_id),
                damaged_count     = (SELECT COUNT(*)
                                     FROM damage_analyses
                                     WHERE batch_id = p_id AND status = 'damaged'),
                not_damaged_count = (SELECT COUNT(*)
                                     FROM damage_analyses
                                     WHERE batch_id = p_id AND status = 'not_damaged'),
                flagged_count     = (SELECT COUNT(*)
                                     FROM damage_analyses
                                     WHERE batch_id = p_id AND is_flagged = 1)
            WHERE id = p_id;
            SELECT * FROM damage_batches WHERE id = p_id;
        END
    """),

    # ── Analyses ───────────────────────────────────────────────────────────────

    ("sp_create_analysis", """
        CREATE PROCEDURE sp_create_analysis(
            IN p_image_path         VARCHAR(500),
            IN p_original_name      VARCHAR(255),
            IN p_source             VARCHAR(50),
            IN p_status             VARCHAR(50),
            IN p_confidence         DOUBLE,
            IN p_severity           VARCHAR(50),
            IN p_damage_types       JSON,
            IN p_region_description TEXT,
            IN p_explanation        TEXT,
            IN p_is_flagged         TINYINT(1),
            IN p_batch_id           INT,
            IN p_bounding_boxes     JSON
        )
        BEGIN
            INSERT INTO damage_analyses
                (image_path, original_name, source, status, confidence, severity,
                 damage_types, region_description, explanation,
                 is_flagged, batch_id, bounding_boxes)
            VALUES
                (p_image_path, p_original_name, p_source, p_status,
                 p_confidence, p_severity, p_damage_types,
                 p_region_description, p_explanation,
                 p_is_flagged, p_batch_id, p_bounding_boxes);
            SELECT * FROM damage_analyses WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_get_analysis", """
        CREATE PROCEDURE sp_get_analysis(IN p_id INT)
        BEGIN
            SELECT * FROM damage_analyses WHERE id = p_id;
        END
    """),

    # Dynamic WHERE — uses PREPARE/EXECUTE to handle optional filters safely.
    # QUOTE() escapes string inputs; integers are CAST to CHAR.
    ("sp_list_analyses", """
        CREATE PROCEDURE sp_list_analyses(
            IN p_status     VARCHAR(50),
            IN p_severity   VARCHAR(50),
            IN p_is_flagged TINYINT,
            IN p_batch_id   INT,
            IN p_limit      INT,
            IN p_offset     INT
        )
        BEGIN
            SET @q = 'SELECT * FROM damage_analyses WHERE 1=1';

            IF p_status IS NOT NULL AND p_status <> '' THEN
                SET @q = CONCAT(@q, ' AND status = ', QUOTE(p_status));
            END IF;

            IF p_severity IS NOT NULL AND p_severity <> '' THEN
                SET @q = CONCAT(@q, ' AND severity = ', QUOTE(p_severity));
            END IF;

            IF p_is_flagged IS NOT NULL THEN
                SET @q = CONCAT(@q, ' AND is_flagged = ', CAST(p_is_flagged AS CHAR));
            END IF;

            IF p_batch_id IS NOT NULL THEN
                SET @q = CONCAT(@q, ' AND batch_id = ', CAST(p_batch_id AS CHAR));
            END IF;

            SET @q = CONCAT(@q,
                ' ORDER BY created_at DESC LIMIT ',  p_limit,
                ' OFFSET ', p_offset);

            PREPARE stmt FROM @q;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END
    """),

    ("sp_update_feedback", """
        CREATE PROCEDURE sp_update_feedback(IN p_id INT, IN p_feedback VARCHAR(50))
        BEGIN
            UPDATE damage_analyses SET user_feedback = p_feedback WHERE id = p_id;
            SELECT * FROM damage_analyses WHERE id = p_id;
        END
    """),

    # Returns (deleted TINYINT, image_path VARCHAR) so the caller knows what to clean up.
    ("sp_delete_analysis", """
        CREATE PROCEDURE sp_delete_analysis(IN p_id INT)
        BEGIN
            DECLARE v_path VARCHAR(500) DEFAULT NULL;
            SELECT image_path INTO v_path FROM damage_analyses WHERE id = p_id LIMIT 1;
            IF v_path IS NOT NULL THEN
                DELETE FROM damage_analyses WHERE id = p_id;
                SELECT 1 AS deleted, v_path AS image_path;
            ELSE
                SELECT 0 AS deleted, NULL AS image_path;
            END IF;
        END
    """),

    # ── Few-shot examples ──────────────────────────────────────────────────────

    ("sp_get_few_shot_examples", """
        CREATE PROCEDURE sp_get_few_shot_examples(IN p_limit INT)
        BEGIN
            SELECT original_name, status, confidence, explanation
            FROM   damage_analyses
            WHERE  user_feedback = 'incorrect'
            ORDER  BY created_at DESC
            LIMIT  p_limit;
        END
    """),

    # ── Dashboard stats ────────────────────────────────────────────────────────

    ("sp_get_summary_stats", """
        CREATE PROCEDURE sp_get_summary_stats()
        BEGIN
            SELECT
                COUNT(*)                                        AS total,
                SUM(status = 'damaged')                         AS damaged,
                SUM(status = 'not_damaged')                     AS not_damaged,
                SUM(status = 'uncertain')                       AS uncertain,
                SUM(is_flagged = 1)                             AS flagged,
                SUM(user_feedback = 'correct')                  AS correct_count,
                SUM(user_feedback = 'incorrect')                AS incorrect_count
            FROM damage_analyses;
        END
    """),

    ("sp_get_flagged_items", """
        CREATE PROCEDURE sp_get_flagged_items(IN p_limit INT)
        BEGIN
            SELECT * FROM damage_analyses
            WHERE  is_flagged = 1
            ORDER  BY created_at DESC
            LIMIT  p_limit;
        END
    """),

    ("sp_get_incorrect_items", """
        CREATE PROCEDURE sp_get_incorrect_items(IN p_limit INT)
        BEGIN
            SELECT * FROM damage_analyses
            WHERE  user_feedback = 'incorrect'
            ORDER  BY created_at DESC
            LIMIT  p_limit;
        END
    """),
]


def init_db() -> None:
    """Create tables and (re)create all stored procedures."""
    conn = _connect()
    try:
        with conn.cursor() as cur:
            # Tables (each statement separately — PyMySQL doesn't support multi-statement by default)
            for stmt in _CREATE_TABLES.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    cur.execute(stmt)

            # Stored procedures — drop then create so restarts are idempotent
            for name, body in _STORED_PROCEDURES:
                cur.execute(f"DROP PROCEDURE IF EXISTS {name}")
                cur.execute(body.strip())

        conn.commit()
        print(f"[damageai] MySQL ready — {len(_STORED_PROCEDURES)} stored procedures loaded.")
    finally:
        conn.close()
