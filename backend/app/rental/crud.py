"""
CRUD layer — every database operation is a stored-procedure call.
No raw SQL exists here; all SQL lives in database.py / MySQL.
"""
from __future__ import annotations
import json
import pymysql.connections

from app.database import row_to_dict


# ─── Internal helpers ─────────────────────────────────────────────────────────

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


def _call_multi(conn: pymysql.connections.Connection, sp: str, args: tuple = ()) -> list[list[dict]]:
    """Call a stored procedure that returns multiple result sets (e.g. fleet stats)."""
    results: list[list[dict]] = []
    with conn.cursor() as cur:
        cur.execute(f"CALL {sp}({', '.join(['%s'] * len(args))})", args)
        while True:
            rows = cur.fetchall()
            results.append([row_to_dict(r) for r in rows])
            if not cur.nextset():
                break
    return results


# ─── Vehicles ─────────────────────────────────────────────────────────────────

def create_vehicle(conn, *, make: str, model: str, year: int, color: str,
                   plate_number: str, category: str) -> dict:
    return _call_one(conn, "sp_create_vehicle", (make, model, year, color, plate_number, category))


def list_vehicles(conn, status: str | None = None) -> list[dict]:
    return _call_many(conn, "sp_list_vehicles", (status or "",))


def get_vehicle(conn, vehicle_id: int) -> dict | None:
    return _call_one(conn, "sp_get_vehicle", (vehicle_id,))


def update_vehicle(conn, vehicle_id: int, *, make: str, model: str, year: int,
                   color: str, plate_number: str, category: str) -> dict | None:
    return _call_one(conn, "sp_update_vehicle",
                     (vehicle_id, make, model, year, color, plate_number, category))


def delete_vehicle(conn, vehicle_id: int) -> bool:
    row = _call_one(conn, "sp_delete_vehicle", (vehicle_id,))
    return bool(row and row.get("deleted"))


# ─── Customers ────────────────────────────────────────────────────────────────

def create_customer(conn, *, full_name: str, phone: str,
                    email: str | None, id_number: str,
                    address: str | None = None,
                    license_expiry: str | None = None) -> dict:
    return _call_one(conn, "sp_create_customer",
                     (full_name, phone, email, id_number, address, license_expiry))


def list_customers(conn, search: str | None = None) -> list[dict]:
    return _call_many(conn, "sp_list_customers", (search or "",))


def get_customer(conn, customer_id: int) -> dict | None:
    return _call_one(conn, "sp_get_customer", (customer_id,))


# ─── Rentals ──────────────────────────────────────────────────────────────────

def create_rental(conn, *, vehicle_id: int, customer_id: int,
                  start_date: str, expected_return_date: str,
                  notes: str | None,
                  pickup_location: str | None = None,
                  dropoff_location: str | None = None,
                  fuel_level_pickup: str | None = None,
                  odometer_pickup: int | None = None,
                  daily_rate: float | None = None) -> dict:
    return _call_one(conn, "sp_create_rental", (
        vehicle_id, customer_id, start_date, expected_return_date, notes,
        pickup_location, dropoff_location, fuel_level_pickup, odometer_pickup, daily_rate,
    ))


def list_rentals(conn, status: str | None = None, vehicle_id: int | None = None,
                 limit: int = 20, offset: int = 0) -> list[dict]:
    return _call_many(conn, "sp_list_rentals", (status or "", vehicle_id, limit, offset))


def get_rental_detail(conn, rental_id: int) -> dict | None:
    return _call_one(conn, "sp_get_rental_detail", (rental_id,))


def update_rental_status(conn, rental_id: int, new_status: str,
                         actual_return_date: str | None = None) -> dict | None:
    return _call_one(conn, "sp_update_rental_status",
                     (rental_id, new_status, actual_return_date))


def update_rental(conn, rental_id: int, *, expected_return_date: str,
                  notes: str | None, daily_rate: float | None,
                  pickup_location: str | None, dropoff_location: str | None) -> dict | None:
    return _call_one(conn, "sp_update_rental",
                     (rental_id, expected_return_date, notes, daily_rate,
                      pickup_location, dropoff_location))


def delete_rental(conn, rental_id: int) -> tuple[bool, str]:
    """Returns (success, reason). reason is '' on success, 'not_found' or 'already_active' on failure."""
    row = _call_one(conn, "sp_delete_rental", (rental_id,))
    if not row:
        return False, "not_found"
    return bool(row.get("deleted")), row.get("reason", "")


def get_rentals_for_vehicle(conn, vehicle_id: int, limit: int = 10) -> list[dict]:
    return _call_many(conn, "sp_get_rentals_for_vehicle", (vehicle_id, limit))


# ─── Positions ────────────────────────────────────────────────────────────────

def list_positions(conn) -> list[dict]:
    return _call_many(conn, "sp_list_positions", ())


def create_position(conn, *, name: str, sort_order: int = 99) -> dict:
    return _call_one(conn, "sp_create_position", (name, sort_order))


def update_position(conn, position_id: int, *, name: str, sort_order: int) -> dict | None:
    return _call_one(conn, "sp_update_position", (position_id, name, sort_order))


def delete_position(conn, position_id: int) -> bool:
    row = _call_one(conn, "sp_delete_position", (position_id,))
    return bool(row and row.get("deleted"))


# ─── Inspections ──────────────────────────────────────────────────────────────

def create_inspection(conn, *, rental_id: int, inspection_type: str) -> dict:
    return _call_one(conn, "sp_create_inspection", (rental_id, inspection_type))


def get_or_create_inspection(conn, *, rental_id: int, inspection_type: str) -> dict | None:
    """Return the existing in_progress inspection or create a fresh one."""
    return _call_one(conn, "sp_get_or_create_inspection", (rental_id, inspection_type))


def get_inspection(conn, inspection_id: int) -> dict | None:
    return _call_one(conn, "sp_get_inspection", (inspection_id,))


def get_inspection_by_rental(conn, rental_id: int, inspection_type: str) -> dict | None:
    """Get the latest completed inspection of given type for a rental."""
    return _call_one(conn, "sp_get_inspection_by_rental", (rental_id, inspection_type))


def add_inspection_photo(conn, *, inspection_id: int,
                         position_id: int, image_path: str) -> dict:
    return _call_one(conn, "sp_add_inspection_photo",
                     (inspection_id, position_id, image_path))


def complete_inspection(conn, inspection_id: int) -> dict | None:
    return _call_one(conn, "sp_complete_inspection", (inspection_id,))


def get_inspection_photos(conn, inspection_id: int) -> list[dict]:
    return _call_many(conn, "sp_get_inspection_photos", (inspection_id,))


# ─── Comparison ───────────────────────────────────────────────────────────────

def create_comparison_result(conn, *, rental_id: int, overall_status: str,
                              damage_count: int, summary: str | None) -> dict:
    return _call_one(conn, "sp_create_comparison_result",
                     (rental_id, overall_status, damage_count, summary))


def upsert_comparison_item(conn, *, comparison_id: int, position_id: int,
                           pre_photo_id: int | None, post_photo_id: int | None,
                           status: str, confidence: float, damage_types: list[str],
                           explanation: str | None, bounding_boxes: list) -> dict:
    return _call_one(conn, "sp_upsert_comparison_item", (
        comparison_id, position_id, pre_photo_id, post_photo_id,
        status, confidence,
        json.dumps(damage_types),
        explanation,
        json.dumps(bounding_boxes),
    ))


def get_comparison_result(conn, rental_id: int) -> dict | None:
    return _call_one(conn, "sp_get_comparison_result", (rental_id,))


def list_comparison_items(conn, comparison_id: int) -> list[dict]:
    return _call_many(conn, "sp_list_comparison_items", (comparison_id,))


def update_comparison_report_path(conn, comparison_id: int, report_path: str) -> None:
    _call_one(conn, "sp_update_comparison_report_path", (comparison_id, report_path))


# ─── Dashboard ────────────────────────────────────────────────────────────────

def get_fleet_stats(conn) -> dict:
    """Calls sp_get_fleet_stats (3 result sets) and sp_get_recent_rentals."""
    result_sets = _call_multi(conn, "sp_get_fleet_stats", ())

    vehicles_row = result_sets[0][0] if result_sets and result_sets[0] else {}
    awaiting_row = result_sets[1][0] if len(result_sets) > 1 and result_sets[1] else {}
    damage_row   = result_sets[2][0] if len(result_sets) > 2 and result_sets[2] else {}

    recent_rentals = _call_many(conn, "sp_get_recent_rentals", (5,))

    return {
        "available":           int(vehicles_row.get("available", 0) or 0),
        "rented_out":          int(vehicles_row.get("rented_out", 0) or 0),
        "total_vehicles":      int(vehicles_row.get("total_vehicles", 0) or 0),
        "awaiting_inspection": int(awaiting_row.get("awaiting_inspection", 0) or 0),
        "damage_this_month":   int(damage_row.get("damage_this_month", 0) or 0),
        "recent_rentals":      recent_rentals,
    }
