"""
API router for the car rental damage detection platform.
All SQL is executed via stored procedures — no raw SQL in this file.
"""
from __future__ import annotations
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.database import get_db
from app.rental import crud, service
from app.rental.schemas import (
    VehicleCreate, VehicleUpdate, VehicleOut,
    CustomerCreate, CustomerOut,
    RentalCreate, RentalUpdate, RentalStatusUpdate, RentalOut,
    PositionCreate, PositionUpdate, PositionOut,
    InspectionOut, InspectionPhotoOut,
    ComparisonResultOut, ComparisonItemOut, ComparisonFullOut,
    FleetStatsOut,
)
from app.config import settings

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


def _check_image(upload: UploadFile) -> None:
    if upload.content_type and upload.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f"Unsupported image type: {upload.content_type}")


# ─── Vehicles ─────────────────────────────────────────────────────────────────

@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(status: str | None = None):
    with get_db() as conn:
        return crud.list_vehicles(conn, status=status)


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(body: VehicleCreate):
    with get_db() as conn:
        row = crud.create_vehicle(conn, **body.model_dump())
    if not row:
        raise HTTPException(500, "Failed to create vehicle")
    return row


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, body: VehicleUpdate):
    with get_db() as conn:
        row = crud.update_vehicle(conn, vehicle_id, **body.model_dump())
    if not row:
        raise HTTPException(404, "Vehicle not found")
    return row


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int):
    with get_db() as conn:
        ok = crud.delete_vehicle(conn, vehicle_id)
    if not ok:
        raise HTTPException(409, "Cannot delete vehicle with existing rentals")


# ─── Customers ────────────────────────────────────────────────────────────────

@router.get("/customers", response_model=list[CustomerOut])
def list_customers(search: str | None = None):
    with get_db() as conn:
        return crud.list_customers(conn, search=search)


@router.post("/customers", response_model=CustomerOut, status_code=201)
def create_customer(body: CustomerCreate):
    with get_db() as conn:
        row = crud.create_customer(conn, **body.model_dump())
    if not row:
        raise HTTPException(500, "Failed to create customer")
    return row


# ─── Rentals ──────────────────────────────────────────────────────────────────

@router.get("/rentals", response_model=list[RentalOut])
def list_rentals(status: str | None = None, vehicle_id: int | None = None,
                 limit: int = 20, offset: int = 0):
    with get_db() as conn:
        return crud.list_rentals(conn, status=status, vehicle_id=vehicle_id,
                                 limit=limit, offset=offset)


@router.post("/rentals", response_model=RentalOut, status_code=201)
def create_rental(body: RentalCreate):
    with get_db() as conn:
        row = crud.create_rental(conn, **body.model_dump())
    if not row:
        raise HTTPException(500, "Failed to create rental")
    return row


@router.get("/rentals/{rental_id}", response_model=RentalOut)
def get_rental(rental_id: int):
    with get_db() as conn:
        row = crud.get_rental_detail(conn, rental_id)
    if not row:
        raise HTTPException(404, "Rental not found")
    return row


@router.patch("/rentals/{rental_id}", response_model=RentalOut)
def update_rental(rental_id: int, body: RentalUpdate):
    with get_db() as conn:
        row = crud.update_rental(conn, rental_id, **body.model_dump())
    if not row:
        raise HTTPException(404, "Rental not found")
    return row


@router.delete("/rentals/{rental_id}", status_code=204)
def delete_rental(rental_id: int):
    with get_db() as conn:
        ok, reason = crud.delete_rental(conn, rental_id)
    if not ok:
        if reason == "not_found":
            raise HTTPException(404, "Rental not found")
        raise HTTPException(409, "Cannot delete a rental that has already been activated. Only pre-inspection pending rentals can be deleted.")


@router.patch("/rentals/{rental_id}/status", response_model=RentalOut)
def update_rental_status(rental_id: int, body: RentalStatusUpdate):
    with get_db() as conn:
        row = crud.update_rental_status(conn, rental_id, body.status,
                                        body.actual_return_date)
    if not row:
        raise HTTPException(404, "Rental not found")
    return row


# ─── Positions ────────────────────────────────────────────────────────────────

@router.get("/positions", response_model=list[PositionOut])
def list_positions():
    with get_db() as conn:
        return crud.list_positions(conn)


@router.post("/positions", response_model=PositionOut, status_code=201)
def create_position(body: PositionCreate):
    with get_db() as conn:
        row = crud.create_position(conn, **body.model_dump())
    if not row:
        raise HTTPException(500, "Failed to create position")
    return row


@router.patch("/positions/{position_id}", response_model=PositionOut)
def update_position(position_id: int, body: PositionUpdate):
    with get_db() as conn:
        row = crud.update_position(conn, position_id, **body.model_dump())
    if not row:
        raise HTTPException(404, "Position not found")
    return row


@router.delete("/positions/{position_id}", status_code=204)
def delete_position(position_id: int):
    with get_db() as conn:
        ok = crud.delete_position(conn, position_id)
    if not ok:
        raise HTTPException(404, "Position not found")


# ─── Inspections ──────────────────────────────────────────────────────────────

@router.post("/rentals/{rental_id}/inspections/{inspection_type}",
             response_model=InspectionOut, status_code=201)
def create_inspection(rental_id: int, inspection_type: str):
    """Create or return the active in-progress inspection (idempotent on remount)."""
    if inspection_type not in ("pre", "post"):
        raise HTTPException(400, "inspection_type must be 'pre' or 'post'")
    with get_db() as conn:
        row = crud.get_or_create_inspection(conn, rental_id=rental_id,
                                            inspection_type=inspection_type)
    if not row:
        raise HTTPException(500, "Failed to create inspection")
    return row


@router.get("/rentals/{rental_id}/inspections/{inspection_type}",
            response_model=InspectionOut)
def get_inspection_by_type(rental_id: int, inspection_type: str):
    """Fetch the latest completed inspection of given type for a rental."""
    if inspection_type not in ("pre", "post"):
        raise HTTPException(400, "inspection_type must be 'pre' or 'post'")
    with get_db() as conn:
        row = crud.get_inspection_by_rental(conn, rental_id, inspection_type)
    if not row:
        raise HTTPException(404, "Inspection not found")
    return row


@router.post("/inspections/{inspection_id}/photos",
             response_model=InspectionPhotoOut, status_code=201)
async def add_inspection_photo(
    inspection_id: int,
    position_id: int = Form(...),
    file: UploadFile = File(...),
):
    _check_image(file)
    filename, _ = await service.save_upload(file)
    with get_db() as conn:
        row = crud.add_inspection_photo(
            conn,
            inspection_id=inspection_id,
            position_id=position_id,
            image_path=filename,
        )
    if not row:
        raise HTTPException(500, "Failed to save photo")
    return row


@router.patch("/inspections/{inspection_id}/complete", response_model=InspectionOut)
def complete_inspection(inspection_id: int):
    with get_db() as conn:
        row = crud.complete_inspection(conn, inspection_id)
    if not row:
        raise HTTPException(404, "Inspection not found")
    return row


@router.get("/inspections/{inspection_id}/photos",
            response_model=list[InspectionPhotoOut])
def get_inspection_photos(inspection_id: int):
    with get_db() as conn:
        return crud.get_inspection_photos(conn, inspection_id)


# ─── Comparison ───────────────────────────────────────────────────────────────

@router.post("/rentals/{rental_id}/compare", response_model=ComparisonResultOut)
def run_comparison(rental_id: int):
    with get_db() as conn:
        rental = crud.get_rental_detail(conn, rental_id)
        if not rental:
            raise HTTPException(404, "Rental not found")

        # Mark as comparing
        crud.update_rental_status(conn, rental_id, "comparing")

        # Find pre and post inspections via stored procedures
        pre_insp  = crud.get_inspection_by_rental(conn, rental_id, "pre")
        post_insp = crud.get_inspection_by_rental(conn, rental_id, "post")

        if not pre_insp or not post_insp:
            raise HTTPException(400, "Both pre and post inspections must be completed before comparing")

        pre_photos  = crud.get_inspection_photos(conn, pre_insp["id"])
        post_photos = crud.get_inspection_photos(conn, post_insp["id"])

        try:
            comparison = service.run_comparison(conn, rental_id, pre_photos, post_photos)
        except Exception as exc:
            crud.update_rental_status(conn, rental_id, "post_inspection_pending")
            raise HTTPException(503, f"Comparison failed: {exc}") from exc

        # Mark rental completed + free vehicle
        crud.update_rental_status(conn, rental_id, "completed",
                                  rental.get("actual_return_date"))

    return comparison


@router.get("/rentals/{rental_id}/comparison", response_model=ComparisonFullOut)
def get_comparison(rental_id: int):
    with get_db() as conn:
        result = crud.get_comparison_result(conn, rental_id)
        if not result:
            raise HTTPException(404, "No comparison result found for this rental")
        items = crud.list_comparison_items(conn, result["id"])
    return {"result": result, "items": items}


# ─── PDF Report ───────────────────────────────────────────────────────────────

@router.get("/rentals/{rental_id}/report/pdf")
def get_pdf_report(rental_id: int):
    with get_db() as conn:
        rental = crud.get_rental_detail(conn, rental_id)
        if not rental:
            raise HTTPException(404, "Rental not found")
        comparison = crud.get_comparison_result(conn, rental_id)
        if not comparison:
            raise HTTPException(404, "No comparison result found")
        items = crud.list_comparison_items(conn, comparison["id"])

    # Return cached PDF if it exists
    if comparison.get("report_path"):
        cached = Path(settings.DAMAGE_STORAGE_DIR).parent / "reports" / Path(comparison["report_path"]).name
        if cached.exists():
            return FileResponse(str(cached), media_type="application/pdf",
                                filename=f"rental_{rental_id}_report.pdf")

    # Generate PDF
    try:
        report_path = service.generate_pdf_report(rental, comparison, items)
    except Exception as exc:
        raise HTTPException(500, f"PDF generation failed: {exc}") from exc

    # Persist path
    with get_db() as conn:
        crud.update_comparison_report_path(conn, comparison["id"], report_path.name)

    return FileResponse(str(report_path), media_type="application/pdf",
                        filename=f"rental_{rental_id}_report.pdf")


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard/fleet-stats", response_model=FleetStatsOut)
def fleet_stats():
    with get_db() as conn:
        return crud.get_fleet_stats(conn)


# ─── Static image serving ─────────────────────────────────────────────────────

@router.get("/images/{filename}")
def serve_image(filename: str):
    from pathlib import Path as _P
    path = _P(settings.DAMAGE_STORAGE_DIR) / filename
    if not path.exists():
        raise HTTPException(404, "Image not found")
    suffix = path.suffix.lower()
    media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                   ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
    return FileResponse(str(path), media_type=media_types.get(suffix, "image/jpeg"))
