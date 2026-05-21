import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "damage.db"

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS damage_batches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    label            TEXT,
    total_count      INTEGER NOT NULL DEFAULT 0,
    damaged_count    INTEGER NOT NULL DEFAULT 0,
    not_damaged_count INTEGER NOT NULL DEFAULT 0,
    flagged_count    INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS damage_analyses (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path         TEXT NOT NULL,
    original_name      TEXT,
    source             TEXT NOT NULL DEFAULT 'upload',
    status             TEXT NOT NULL,
    confidence         REAL NOT NULL,
    severity           TEXT NOT NULL DEFAULT 'none',
    damage_types       TEXT NOT NULL DEFAULT '[]',
    region_description TEXT,
    explanation        TEXT,
    is_flagged         INTEGER NOT NULL DEFAULT 0,
    batch_id           INTEGER REFERENCES damage_batches(id) ON DELETE SET NULL,
    user_feedback      TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);
"""

def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(CREATE_SQL)
        conn.commit()
    print(f"[damage-detector] Database ready at {DB_PATH}")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    if "damage_types" in d:
        try:
            val = d["damage_types"]
            if isinstance(val, (bytes, bytearray)):
                val = val.decode("utf-8")
            d["damage_types"] = json.loads(val) if isinstance(val, str) else (val or [])
        except Exception:
            d["damage_types"] = []
    if "is_flagged" in d:
        d["is_flagged"] = bool(d["is_flagged"])
    return d
