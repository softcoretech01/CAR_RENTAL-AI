"""Pydantic schemas for the car rental domain."""
from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


# ─── Vehicles ─────────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    category: str = "sedan"

class VehicleUpdate(BaseModel):
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    category: str

class VehicleOut(BaseModel):
    id: int
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    category: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


# ─── Customers ────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    id_number: str
    address: Optional[str] = None
    license_expiry: Optional[str] = None  # "YYYY-MM-DD"

class CustomerOut(BaseModel):
    id: int
    full_name: str
    phone: str
    email: Optional[str] = None
    id_number: str
    address: Optional[str] = None
    license_expiry: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


# ─── Rentals ──────────────────────────────────────────────────────────────────

class RentalCreate(BaseModel):
    vehicle_id: int
    customer_id: int
    start_date: str            # "YYYY-MM-DD"
    expected_return_date: str  # "YYYY-MM-DD"
    notes: Optional[str] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    fuel_level_pickup: Optional[str] = None   # full | 3/4 | 1/2 | 1/4 | empty
    odometer_pickup: Optional[int] = None
    daily_rate: Optional[float] = None

class RentalStatusUpdate(BaseModel):
    status: str
    actual_return_date: Optional[str] = None  # "YYYY-MM-DD"

class RentalUpdate(BaseModel):
    expected_return_date: str           # "YYYY-MM-DD"
    notes: Optional[str] = None
    daily_rate: Optional[float] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None

class RentalOut(BaseModel):
    id: int
    vehicle_id: int
    customer_id: int
    start_date: str
    expected_return_date: str
    actual_return_date: Optional[str] = None
    status: str
    notes: Optional[str] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    fuel_level_pickup: Optional[str] = None
    odometer_pickup: Optional[int] = None
    daily_rate: Optional[float] = None
    created_at: str
    # Joined vehicle fields
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    plate_number: Optional[str] = None
    category: Optional[str] = None
    # Joined customer fields
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Positions ────────────────────────────────────────────────────────────────

class PositionCreate(BaseModel):
    name: str
    sort_order: int = 99

class PositionUpdate(BaseModel):
    name: str
    sort_order: int

class PositionOut(BaseModel):
    id: int
    name: str
    sort_order: int
    is_default: bool

    model_config = {"from_attributes": True}


# ─── Inspections ──────────────────────────────────────────────────────────────

class InspectionOut(BaseModel):
    id: int
    rental_id: int
    type: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}

class InspectionPhotoOut(BaseModel):
    id: int
    inspection_id: int
    position_id: int
    image_path: str
    created_at: str
    position_name: Optional[str] = None
    sort_order: Optional[int] = None

    model_config = {"from_attributes": True}


# ─── Comparison ───────────────────────────────────────────────────────────────

class ComparisonResultOut(BaseModel):
    id: int
    rental_id: int
    overall_status: str
    damage_count: int
    summary: Optional[str] = None
    report_path: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}

class ComparisonItemOut(BaseModel):
    id: int
    comparison_id: int
    position_id: int
    pre_photo_id: Optional[int] = None
    post_photo_id: Optional[int] = None
    status: str
    confidence: float
    damage_types: list[str] = []
    explanation: Optional[str] = None
    bounding_boxes: list[list[float]] = []
    position_name: Optional[str] = None
    sort_order: Optional[int] = None
    pre_image_path: Optional[str] = None
    post_image_path: Optional[str] = None

    model_config = {"from_attributes": True}

class ComparisonFullOut(BaseModel):
    result: ComparisonResultOut
    items: list[ComparisonItemOut]


# ─── Dashboard ────────────────────────────────────────────────────────────────

class FleetStatsOut(BaseModel):
    available: int
    rented_out: int
    total_vehicles: int
    awaiting_inspection: int
    damage_this_month: int
    recent_rentals: list[RentalOut] = []
