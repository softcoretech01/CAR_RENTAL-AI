"""
MySQL database layer using PyMySQL.
All SQL lives in stored procedures defined here — the application
calls CALL sp_name(...) and never writes raw SQL itself.
"""
from __future__ import annotations
import json
from contextlib import contextmanager
from datetime import datetime, date

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
    """Normalise a DictCursor row: parse JSON fields, booleans, dates, datetimes."""
    if row is None:
        return None
    d = dict(row)

    # JSON array fields
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
            elif not isinstance(val, list):
                d[field] = []

    # Boolean fields
    for field in ("is_default",):
        if field in d:
            d[field] = bool(d[field])

    # DATE fields → "YYYY-MM-DD"
    for field in ("start_date", "expected_return_date", "actual_return_date"):
        if field in d:
            v = d[field]
            if isinstance(v, (datetime, date)):
                d[field] = v.strftime("%Y-%m-%d")

    # DATETIME fields → "YYYY-MM-DD HH:MM:SS"
    for field in ("created_at",):
        if field in d:
            v = d[field]
            if isinstance(v, datetime):
                d[field] = v.strftime("%Y-%m-%d %H:%M:%S")

    return d


# ─── Schema + stored procedures ───────────────────────────────────────────────

# Drop legacy tables from the old DamageAI app on first run
_LEGACY_DROP = """
DROP TABLE IF EXISTS damage_analyses;
DROP TABLE IF EXISTS damage_batches;
"""

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS vehicles (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    make         VARCHAR(100) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    year         INT NOT NULL,
    color        VARCHAR(50) NOT NULL,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    category     ENUM('sedan','suv','hatchback','van','other') NOT NULL DEFAULT 'sedan',
    status       ENUM('available','rented_out') NOT NULL DEFAULT 'available',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(255) NOT NULL,
    phone      VARCHAR(50) NOT NULL,
    email      VARCHAR(255),
    id_number  VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rentals (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id           INT NOT NULL,
    customer_id          INT NOT NULL,
    start_date           DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date   DATE,
    status               ENUM('pre_inspection_pending','pre_inspection_done','rented_out','post_inspection_pending','comparing','completed') NOT NULL DEFAULT 'pre_inspection_pending',
    notes                TEXT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id)  ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspection_positions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_default TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspections (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    rental_id  INT NOT NULL,
    type       ENUM('pre','post') NOT NULL,
    status     ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspection_photos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    position_id   INT NOT NULL,
    image_path    VARCHAR(500) NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id)   REFERENCES inspection_positions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparison_results (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    rental_id      INT UNIQUE NOT NULL,
    overall_status ENUM('clean','damaged','uncertain') NOT NULL DEFAULT 'uncertain',
    damage_count   INT NOT NULL DEFAULT 0,
    summary        TEXT,
    report_path    VARCHAR(500),
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparison_items (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    comparison_id  INT NOT NULL,
    position_id    INT NOT NULL,
    pre_photo_id   INT,
    post_photo_id  INT,
    status         ENUM('new_damage','no_change','uncertain') NOT NULL DEFAULT 'no_change',
    confidence     FLOAT NOT NULL DEFAULT 100,
    damage_types   JSON NOT NULL,
    explanation    TEXT,
    bounding_boxes JSON NOT NULL,
    UNIQUE KEY uq_comp_pos (comparison_id, position_id),
    FOREIGN KEY (comparison_id) REFERENCES comparison_results(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id)   REFERENCES inspection_positions(id) ON DELETE RESTRICT,
    FOREIGN KEY (pre_photo_id)  REFERENCES inspection_photos(id)    ON DELETE SET NULL,
    FOREIGN KEY (post_photo_id) REFERENCES inspection_photos(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

_DEFAULT_POSITIONS = [
    ("Front", 1),
    ("Front-Left Corner", 2),
    ("Left Side", 3),
    ("Rear-Left Corner", 4),
    ("Rear", 5),
    ("Rear-Right Corner", 6),
    ("Right Side", 7),
    ("Front-Right Corner", 8),
    ("Roof", 9),
    ("Dashboard", 10),
    ("Odometer", 11),
    ("Front Interior", 12),
    ("Rear Interior", 13),
    ("Trunk", 14),
    ("Engine Bay", 15),
]

_STORED_PROCEDURES: list[tuple[str, str]] = [

    # ── Vehicles ───────────────────────────────────────────────────────────────

    ("sp_create_vehicle", """
        CREATE PROCEDURE sp_create_vehicle(
            IN p_make         VARCHAR(100),
            IN p_model        VARCHAR(100),
            IN p_year         INT,
            IN p_color        VARCHAR(50),
            IN p_plate_number VARCHAR(50),
            IN p_category     VARCHAR(20)
        )
        BEGIN
            INSERT INTO vehicles (make, model, year, color, plate_number, category)
            VALUES (p_make, p_model, p_year, p_color, p_plate_number, p_category);
            SELECT * FROM vehicles WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_list_vehicles", """
        CREATE PROCEDURE sp_list_vehicles(IN p_status VARCHAR(20))
        BEGIN
            IF p_status IS NULL OR p_status = '' THEN
                SELECT * FROM vehicles ORDER BY make, model;
            ELSE
                SELECT * FROM vehicles WHERE status = p_status ORDER BY make, model;
            END IF;
        END
    """),

    ("sp_get_vehicle", """
        CREATE PROCEDURE sp_get_vehicle(IN p_id INT)
        BEGIN
            SELECT * FROM vehicles WHERE id = p_id;
        END
    """),

    ("sp_update_vehicle", """
        CREATE PROCEDURE sp_update_vehicle(
            IN p_id           INT,
            IN p_make         VARCHAR(100),
            IN p_model        VARCHAR(100),
            IN p_year         INT,
            IN p_color        VARCHAR(50),
            IN p_plate_number VARCHAR(50),
            IN p_category     VARCHAR(20)
        )
        BEGIN
            UPDATE vehicles
            SET make = p_make, model = p_model, year = p_year,
                color = p_color, plate_number = p_plate_number, category = p_category
            WHERE id = p_id;
            SELECT * FROM vehicles WHERE id = p_id;
        END
    """),

    ("sp_delete_vehicle", """
        CREATE PROCEDURE sp_delete_vehicle(IN p_id INT)
        BEGIN
            DECLARE v_count INT DEFAULT 0;
            SELECT COUNT(*) INTO v_count FROM rentals WHERE vehicle_id = p_id;
            IF v_count = 0 THEN
                DELETE FROM vehicles WHERE id = p_id;
                SELECT 1 AS deleted;
            ELSE
                SELECT 0 AS deleted;
            END IF;
        END
    """),

    # ── Customers ──────────────────────────────────────────────────────────────

    ("sp_create_customer", """
        CREATE PROCEDURE sp_create_customer(
            IN p_full_name VARCHAR(255),
            IN p_phone     VARCHAR(50),
            IN p_email     VARCHAR(255),
            IN p_id_number VARCHAR(100)
        )
        BEGIN
            INSERT INTO customers (full_name, phone, email, id_number)
            VALUES (p_full_name, p_phone, p_email, p_id_number);
            SELECT * FROM customers WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_list_customers", """
        CREATE PROCEDURE sp_list_customers(IN p_search VARCHAR(255))
        BEGIN
            IF p_search IS NULL OR p_search = '' THEN
                SELECT * FROM customers ORDER BY full_name;
            ELSE
                SELECT * FROM customers
                WHERE full_name LIKE CONCAT('%', p_search, '%')
                   OR phone     LIKE CONCAT('%', p_search, '%')
                   OR id_number LIKE CONCAT('%', p_search, '%')
                ORDER BY full_name;
            END IF;
        END
    """),

    ("sp_get_customer", """
        CREATE PROCEDURE sp_get_customer(IN p_id INT)
        BEGIN
            SELECT * FROM customers WHERE id = p_id;
        END
    """),

    # ── Rentals ────────────────────────────────────────────────────────────────

    ("sp_create_rental", """
        CREATE PROCEDURE sp_create_rental(
            IN p_vehicle_id           INT,
            IN p_customer_id          INT,
            IN p_start_date           DATE,
            IN p_expected_return_date DATE,
            IN p_notes                TEXT
        )
        BEGIN
            INSERT INTO rentals
                (vehicle_id, customer_id, start_date, expected_return_date, notes)
            VALUES
                (p_vehicle_id, p_customer_id, p_start_date, p_expected_return_date, p_notes);
            UPDATE vehicles SET status = 'rented_out' WHERE id = p_vehicle_id;
            SELECT r.*,
                   v.make, v.model, v.year, v.color, v.plate_number, v.category,
                   c.full_name, c.phone, c.email, c.id_number
            FROM rentals r
            JOIN vehicles  v ON v.id = r.vehicle_id
            JOIN customers c ON c.id = r.customer_id
            WHERE r.id = LAST_INSERT_ID();
        END
    """),

    ("sp_list_rentals", """
        CREATE PROCEDURE sp_list_rentals(
            IN p_status     VARCHAR(50),
            IN p_vehicle_id INT,
            IN p_limit      INT,
            IN p_offset     INT
        )
        BEGIN
            SET @q = 'SELECT r.*, v.make, v.model, v.year, v.plate_number, v.color, v.category,
                             c.full_name, c.phone, c.email, c.id_number
                      FROM rentals r
                      JOIN vehicles  v ON v.id = r.vehicle_id
                      JOIN customers c ON c.id = r.customer_id
                      WHERE 1=1';

            IF p_status IS NOT NULL AND p_status <> '' THEN
                SET @q = CONCAT(@q, ' AND r.status = ', QUOTE(p_status));
            END IF;

            IF p_vehicle_id IS NOT NULL THEN
                SET @q = CONCAT(@q, ' AND r.vehicle_id = ', CAST(p_vehicle_id AS CHAR));
            END IF;

            SET @q = CONCAT(@q, ' ORDER BY r.created_at DESC LIMIT ', p_limit, ' OFFSET ', p_offset);

            PREPARE stmt FROM @q;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END
    """),

    ("sp_get_rental_detail", """
        CREATE PROCEDURE sp_get_rental_detail(IN p_id INT)
        BEGIN
            SELECT r.*,
                   v.make, v.model, v.year, v.color, v.plate_number, v.category,
                   c.full_name, c.phone, c.email, c.id_number
            FROM rentals r
            JOIN vehicles  v ON v.id = r.vehicle_id
            JOIN customers c ON c.id = r.customer_id
            WHERE r.id = p_id;
        END
    """),

    ("sp_update_rental_status", """
        CREATE PROCEDURE sp_update_rental_status(
            IN p_id                 INT,
            IN p_new_status         VARCHAR(50),
            IN p_actual_return_date DATE
        )
        BEGIN
            IF p_actual_return_date IS NOT NULL THEN
                UPDATE rentals SET status = p_new_status,
                                   actual_return_date = p_actual_return_date
                WHERE id = p_id;
            ELSE
                UPDATE rentals SET status = p_new_status WHERE id = p_id;
            END IF;
            -- Free vehicle if rental is completed
            IF p_new_status = 'completed' THEN
                UPDATE vehicles SET status = 'available'
                WHERE id = (SELECT vehicle_id FROM rentals WHERE id = p_id);
            END IF;
            SELECT r.*,
                   v.make, v.model, v.year, v.color, v.plate_number, v.category,
                   c.full_name, c.phone, c.email, c.id_number
            FROM rentals r
            JOIN vehicles  v ON v.id = r.vehicle_id
            JOIN customers c ON c.id = r.customer_id
            WHERE r.id = p_id;
        END
    """),

    ("sp_get_rentals_for_vehicle", """
        CREATE PROCEDURE sp_get_rentals_for_vehicle(IN p_vehicle_id INT, IN p_limit INT)
        BEGIN
            SELECT r.*,
                   c.full_name, c.phone, c.email, c.id_number
            FROM rentals r
            JOIN customers c ON c.id = r.customer_id
            WHERE r.vehicle_id = p_vehicle_id
            ORDER BY r.created_at DESC
            LIMIT p_limit;
        END
    """),

    # ── Positions ──────────────────────────────────────────────────────────────

    ("sp_list_positions", """
        CREATE PROCEDURE sp_list_positions()
        BEGIN
            SELECT * FROM inspection_positions ORDER BY sort_order, id;
        END
    """),

    ("sp_create_position", """
        CREATE PROCEDURE sp_create_position(IN p_name VARCHAR(100), IN p_sort_order INT)
        BEGIN
            INSERT INTO inspection_positions (name, sort_order, is_default)
            VALUES (p_name, p_sort_order, 0);
            SELECT * FROM inspection_positions WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_delete_position", """
        CREATE PROCEDURE sp_delete_position(IN p_id INT)
        BEGIN
            DECLARE v_default TINYINT DEFAULT 0;
            SELECT is_default INTO v_default FROM inspection_positions WHERE id = p_id;
            IF v_default = 0 THEN
                DELETE FROM inspection_positions WHERE id = p_id;
                SELECT 1 AS deleted;
            ELSE
                SELECT 0 AS deleted;
            END IF;
        END
    """),

    # ── Inspections ────────────────────────────────────────────────────────────

    ("sp_create_inspection", """
        CREATE PROCEDURE sp_create_inspection(IN p_rental_id INT, IN p_type ENUM('pre','post'))
        BEGIN
            INSERT INTO inspections (rental_id, type) VALUES (p_rental_id, p_type);
            SELECT * FROM inspections WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_get_or_create_inspection", """
        CREATE PROCEDURE sp_get_or_create_inspection(IN p_rental_id INT, IN p_type ENUM('pre','post'))
        BEGIN
            DECLARE v_id INT DEFAULT NULL;
            SELECT id INTO v_id
            FROM inspections
            WHERE rental_id = p_rental_id AND type = p_type AND status = 'in_progress'
            ORDER BY id DESC
            LIMIT 1;

            IF v_id IS NULL THEN
                INSERT INTO inspections (rental_id, type) VALUES (p_rental_id, p_type);
                SET v_id = LAST_INSERT_ID();
            END IF;

            SELECT * FROM inspections WHERE id = v_id;
        END
    """),

    ("sp_get_inspection", """
        CREATE PROCEDURE sp_get_inspection(IN p_id INT)
        BEGIN
            SELECT * FROM inspections WHERE id = p_id;
        END
    """),

    ("sp_get_inspection_by_rental", """
        CREATE PROCEDURE sp_get_inspection_by_rental(
            IN p_rental_id INT,
            IN p_type      VARCHAR(10)
        )
        BEGIN
            SELECT * FROM inspections
            WHERE rental_id = p_rental_id AND type = p_type AND status = 'completed'
            ORDER BY id DESC
            LIMIT 1;
        END
    """),

    ("sp_add_inspection_photo", """
        CREATE PROCEDURE sp_add_inspection_photo(
            IN p_inspection_id INT,
            IN p_position_id   INT,
            IN p_image_path    VARCHAR(500)
        )
        BEGIN
            -- Replace existing photo for same inspection + position
            DELETE FROM inspection_photos
            WHERE inspection_id = p_inspection_id AND position_id = p_position_id;

            INSERT INTO inspection_photos (inspection_id, position_id, image_path)
            VALUES (p_inspection_id, p_position_id, p_image_path);
            SELECT ph.*, pos.name AS position_name, pos.sort_order
            FROM inspection_photos ph
            JOIN inspection_positions pos ON pos.id = ph.position_id
            WHERE ph.id = LAST_INSERT_ID();
        END
    """),

    ("sp_complete_inspection", """
        CREATE PROCEDURE sp_complete_inspection(IN p_id INT)
        BEGIN
            DECLARE v_rental_id INT;
            DECLARE v_type      VARCHAR(10);

            UPDATE inspections SET status = 'completed' WHERE id = p_id;

            SELECT rental_id, type INTO v_rental_id, v_type
            FROM inspections WHERE id = p_id;

            IF v_type = 'pre' THEN
                UPDATE rentals SET status = 'pre_inspection_done' WHERE id = v_rental_id;
            ELSEIF v_type = 'post' THEN
                UPDATE rentals SET status = 'post_inspection_pending' WHERE id = v_rental_id;
            END IF;

            SELECT * FROM inspections WHERE id = p_id;
        END
    """),

    ("sp_get_inspection_photos", """
        CREATE PROCEDURE sp_get_inspection_photos(IN p_inspection_id INT)
        BEGIN
            SELECT ph.*, pos.name AS position_name, pos.sort_order
            FROM inspection_photos ph
            JOIN inspection_positions pos ON pos.id = ph.position_id
            WHERE ph.inspection_id = p_inspection_id
            ORDER BY pos.sort_order, ph.id;
        END
    """),

    # ── Comparison ─────────────────────────────────────────────────────────────

    ("sp_create_comparison_result", """
        CREATE PROCEDURE sp_create_comparison_result(
            IN p_rental_id      INT,
            IN p_overall_status VARCHAR(20),
            IN p_damage_count   INT,
            IN p_summary        TEXT
        )
        BEGIN
            INSERT INTO comparison_results (rental_id, overall_status, damage_count, summary)
            VALUES (p_rental_id, p_overall_status, p_damage_count, p_summary);
            SELECT * FROM comparison_results WHERE id = LAST_INSERT_ID();
        END
    """),

    ("sp_upsert_comparison_item", """
        CREATE PROCEDURE sp_upsert_comparison_item(
            IN p_comparison_id  INT,
            IN p_position_id    INT,
            IN p_pre_photo_id   INT,
            IN p_post_photo_id  INT,
            IN p_status         VARCHAR(20),
            IN p_confidence     FLOAT,
            IN p_damage_types   JSON,
            IN p_explanation    TEXT,
            IN p_bounding_boxes JSON
        )
        BEGIN
            INSERT INTO comparison_items
                (comparison_id, position_id, pre_photo_id, post_photo_id,
                 status, confidence, damage_types, explanation, bounding_boxes)
            VALUES
                (p_comparison_id, p_position_id, p_pre_photo_id, p_post_photo_id,
                 p_status, p_confidence, p_damage_types, p_explanation, p_bounding_boxes)
            ON DUPLICATE KEY UPDATE
                status = p_status,
                confidence = p_confidence,
                damage_types = p_damage_types,
                explanation = p_explanation,
                bounding_boxes = p_bounding_boxes;
            SELECT ci.*, pos.name AS position_name
            FROM comparison_items ci
            JOIN inspection_positions pos ON pos.id = ci.position_id
            WHERE ci.comparison_id = p_comparison_id AND ci.position_id = p_position_id
            LIMIT 1;
        END
    """),

    ("sp_get_comparison_result", """
        CREATE PROCEDURE sp_get_comparison_result(IN p_rental_id INT)
        BEGIN
            SELECT * FROM comparison_results WHERE rental_id = p_rental_id;
        END
    """),

    ("sp_list_comparison_items", """
        CREATE PROCEDURE sp_list_comparison_items(IN p_comparison_id INT)
        BEGIN
            SELECT
                ci.*,
                pos.name AS position_name,
                pos.sort_order,
                pre.image_path  AS pre_image_path,
                post.image_path AS post_image_path
            FROM comparison_items ci
            JOIN inspection_positions pos  ON pos.id  = ci.position_id
            LEFT JOIN inspection_photos pre  ON pre.id  = ci.pre_photo_id
            LEFT JOIN inspection_photos post ON post.id = ci.post_photo_id
            WHERE ci.comparison_id = p_comparison_id
            ORDER BY pos.sort_order, ci.id;
        END
    """),

    ("sp_update_comparison_report_path", """
        CREATE PROCEDURE sp_update_comparison_report_path(
            IN p_comparison_id INT,
            IN p_report_path   VARCHAR(500)
        )
        BEGIN
            UPDATE comparison_results SET report_path = p_report_path
            WHERE id = p_comparison_id;
        END
    """),

    # ── Dashboard ──────────────────────────────────────────────────────────────

    ("sp_get_fleet_stats", """
        CREATE PROCEDURE sp_get_fleet_stats()
        BEGIN
            SELECT
                SUM(status = 'available')    AS available,
                SUM(status = 'rented_out')   AS rented_out,
                COUNT(*)                     AS total_vehicles
            FROM vehicles;

            SELECT COUNT(*) AS awaiting_inspection
            FROM rentals
            WHERE status IN ('post_inspection_pending', 'pre_inspection_pending');

            SELECT COUNT(*) AS damage_this_month
            FROM comparison_results cr
            JOIN rentals r ON r.id = cr.rental_id
            WHERE cr.overall_status = 'damaged'
              AND r.actual_return_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01');
        END
    """),

    ("sp_get_recent_rentals", """
        CREATE PROCEDURE sp_get_recent_rentals(IN p_limit INT)
        BEGIN
            SELECT r.*,
                   v.make, v.model, v.year, v.plate_number, v.color, v.category,
                   c.full_name, c.phone
            FROM rentals r
            JOIN vehicles  v ON v.id = r.vehicle_id
            JOIN customers c ON c.id = r.customer_id
            ORDER BY r.created_at DESC
            LIMIT p_limit;
        END
    """),
]


def init_db() -> None:
    """Drop legacy tables, create new tables, seed positions, recreate all stored procedures."""
    conn = _connect()
    try:
        with conn.cursor() as cur:
            # 1. Drop legacy DamageAI tables (safe — IF EXISTS)
            for stmt in _LEGACY_DROP.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    cur.execute(stmt)

            # 2. Create new tables
            for stmt in _CREATE_TABLES.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    cur.execute(stmt)

            # 3. Seed default positions (only if none exist)
            cur.execute("SELECT COUNT(*) AS cnt FROM inspection_positions WHERE is_default = 1")
            row = cur.fetchone()
            if not row or (row.get("cnt") or 0) == 0:
                for name, order in _DEFAULT_POSITIONS:
                    cur.execute(
                        "INSERT INTO inspection_positions (name, sort_order, is_default) VALUES (%s, %s, 1)",
                        (name, order)
                    )

            # 4. Stored procedures — drop + recreate (idempotent)
            for name, body in _STORED_PROCEDURES:
                cur.execute(f"DROP PROCEDURE IF EXISTS {name}")
                cur.execute(body.strip())

        conn.commit()
        print(f"[rental] MySQL ready — {len(_STORED_PROCEDURES)} stored procedures, {len(_DEFAULT_POSITIONS)} positions seeded.")
    finally:
        conn.close()
