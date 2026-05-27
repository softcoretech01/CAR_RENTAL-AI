# Car Rental Damage Detector — Implementation Plan
**Date:** 2026-05-26  
**Spec:** `docs/superpowers/specs/2026-05-26-car-rental-damage-detector-design.md`  
**Strategy:** Vertical slices — each slice produces a working app end-to-end

---

## Prerequisites

weasyprint requires native libs on macOS:
```bash
brew install pango cairo gdk-pixbuf libffi
pip install weasyprint
```
Linux (Ubuntu/Debian): `apt install libpango-1.0-0 libcairo2 libgdk-pixbuf-2.0-0`

---

## Execution Slices

| Slice | Scope | Smoke Test |
|---|---|---|
| 0 | Foundation: requirements.txt, database.py, main.py | `/health` + 15 positions seeded |
| 1 | Vehicles CRUD backend + `/vehicles` page | Add a car, see it listed |
| 2 | Customers + New Rental Wizard backend + `/rentals/new` | Create rental, status = `pre_inspection_pending` |
| 3 | Inspection Wizard (pre + post) | Complete pre-inspection, photos on rental detail |
| 4 | Comparison engine + `/rentals/:id/comparison` | AI compares, verdict banner renders |
| 5 | PDF report generation + download | Button generates PDF |
| 6 | Fleet Dashboard + Rental History + polish | Dashboard stats, history filters |
| 7 | Remove old `damage/` module, cleanup | App still boots clean |

---

## File Map

### Backend (new / modified)

```
backend/
  requirements.txt                    ← add weasyprint
  app/
    database.py                       ← FULL REWRITE: 7 new tables + 28 SPs + position seeding
    main.py                           ← swap damage_router → rental_router
    config.py                         ← no change
    rental/
      __init__.py
      schemas.py                      ← Pydantic response models
      crud.py                         ← thin SP wrappers (_call_one/_call_many)
      ai_service.py                   ← before/after comparison AI service
      service.py                      ← image pipeline + comparison orchestration + PDF
      router.py                       ← all API routes
    damage/                           ← keep untouched, just unmount router in main.py
```

### Frontend (new / modified)

```
frontend/src/
  lib/api.js                         ← new API methods for rental domain
  index.css                          ← white/indigo/slate design tokens
  App.jsx                            ← new sidebar + routes
  pages/
    FleetDashboard.jsx               ← replaces Dashboard.jsx
    Vehicles.jsx                     ← new
    NewRentalWizard.jsx              ← replaces Analyse.jsx (4-step wizard)
    InspectionWizard.jsx             ← replaces Batch.jsx
    RentalDetail.jsx                 ← replaces History.jsx detail view
    ComparisonResult.jsx             ← replaces Compare.jsx
    RentalHistory.jsx                ← replaces History.jsx list
  components/
    StatusBadge.jsx                  ← replaces SeverityBadge.jsx
    VehicleCard.jsx                  ← new
    PhotoCapture.jsx                 ← wraps ImageUploader + camera input
    ComparisonCard.jsx               ← before/after side-by-side with bounding boxes
```

---

## Database Schema

### Tables (7 new, 2 legacy dropped)

```sql
-- Legacy cleanup: DROP TABLE IF EXISTS damage_analyses, damage_batches;

vehicles(id, make, model, year, color, plate_number UNIQUE, category ENUM, status ENUM, created_at)
customers(id, full_name, phone, email, id_number, created_at)
rentals(id, vehicle_id FK, customer_id FK, start_date DATE, expected_return_date DATE, actual_return_date DATE, status ENUM, notes, created_at)
inspection_positions(id, name, sort_order, is_default)
inspections(id, rental_id FK, type ENUM(pre,post), status ENUM, created_at)
inspection_photos(id, inspection_id FK, position_id FK, image_path, created_at)
comparison_results(id, rental_id UNIQUE FK, overall_status ENUM, damage_count, summary, report_path, created_at)
comparison_items(id, comparison_id FK, position_id FK, pre_photo_id FK, post_photo_id FK, status ENUM, confidence, damage_types JSON, explanation, bounding_boxes JSON)
```

### 15 Default Positions (seeded once)
Front · Front-Left Corner · Left Side · Rear-Left Corner · Rear · Rear-Right Corner ·
Right Side · Front-Right Corner · Roof · Dashboard · Odometer · Front Interior ·
Rear Interior · Trunk · Engine Bay

---

## Stored Procedures (28 total)

### Vehicles (5)
- `sp_create_vehicle(make, model, year, color, plate_number, category)` → row
- `sp_list_vehicles(p_status)` → rows (NULL = all)
- `sp_get_vehicle(id)` → row
- `sp_update_vehicle(id, make, model, year, color, plate_number, category)` → row
- `sp_delete_vehicle(id)` → `{deleted}`

### Customers (3)
- `sp_create_customer(full_name, phone, email, id_number)` → row
- `sp_list_customers(p_search)` → rows (NULL = all, else LIKE %search%)
- `sp_get_customer(id)` → row

### Rentals (5)
- `sp_create_rental(vehicle_id, customer_id, start_date, expected_return_date, notes)` → row
- `sp_list_rentals(p_status, p_vehicle_id, p_limit, p_offset)` → rows + vehicle/customer info
- `sp_get_rental_detail(id)` → row joined with vehicle + customer
- `sp_update_rental_status(id, new_status, actual_return_date)` → row
- `sp_get_rentals_for_vehicle(vehicle_id, p_limit)` → rows

### Inspections (5)
- `sp_create_inspection(rental_id, type)` → row
- `sp_get_inspection(id)` → row
- `sp_add_inspection_photo(inspection_id, position_id, image_path)` → row
- `sp_complete_inspection(id)` → row
- `sp_get_inspection_photos(inspection_id)` → rows joined with position name

### Comparison (5)
- `sp_create_comparison_result(rental_id, overall_status, damage_count, summary)` → row
- `sp_upsert_comparison_item(comparison_id, position_id, pre_photo_id, post_photo_id, status, confidence, damage_types, explanation, bounding_boxes)` → row
- `sp_get_comparison_result(rental_id)` → row
- `sp_list_comparison_items(comparison_id)` → rows joined with position name + photo paths
- `sp_update_comparison_report_path(comparison_id, report_path)` → void

### Positions (3)
- `sp_list_positions()` → rows ordered by sort_order
- `sp_create_position(name, sort_order)` → row
- `sp_delete_position(id)` → `{deleted}`

### Dashboard (2)
- `sp_get_fleet_stats()` → `{available, rented_out, awaiting_inspection, damage_this_month}`
- `sp_get_recent_rentals(p_limit)` → rows joined with vehicle + customer

---

## row_to_dict() Extensions

New fields to normalise in `database.py`:
- `damage_types`, `bounding_boxes` — same JSON parsing as before (carry over)
- `is_default` — bool from TINYINT
- `start_date`, `expected_return_date`, `actual_return_date` — `date` objects → `"%Y-%m-%d"` string
- All `DATETIME` columns → `"%Y-%m-%d %H:%M:%S"` (same as existing)

---

## AI Comparison Prompt

Two images per position (before + after). Model returns:
```json
{
  "status": "new_damage|no_change|uncertain",
  "confidence": 0-100,
  "damage_types": ["scratch","dent","crack","burn","stain","other"],
  "explanation": "...",
  "bounding_boxes": [[ymin,xmin,ymax,xmax]]
}
```
Boxes reference AFTER image only. Positions missing a pre or post photo default to `no_change` at 100%.

---

## Bounding Box Fix (ComparisonResult)

Previous app used `objectFit: contain` causing letterbox misalignment.  
Fix: render image inside a fixed-aspect-ratio wrapper using `object-fit: cover` OR use an `onLoad` handler that reads `img.naturalWidth/naturalHeight` vs rendered size and applies a transform offset. Plan uses a `<div style="position:relative; aspectRatio: naturalW/naturalH">` wrapper computed after `onLoad`.

---

## PDF Report Structure

Rendered server-side with weasyprint from an HTML template:
1. Header: logo placeholder, report title, generated date
2. Section: Customer details + Vehicle details + Rental dates
3. Section: Per-position table (position name | before photo | after photo | verdict | explanation)
4. Section: Overall result banner (Clean / Damage Found / Uncertain)
5. Footer: "Generated by Car Rental Damage Detector"

Stored in `storage/reports/{rental_id}.pdf`, path saved to `comparison_results.report_path`.

---

## Comparison Latency

15 positions × Groq call ≈ 15–30s.  
Frontend: show `ComparisonProgress` component with "Comparing position X / Y…" counter via polling `GET /rentals/:id/comparison` every 2s until status = `completed`.  
Backend: synchronous per spec — update rental status to `comparing` at start, `completed` at end.

---

## API Routes Summary

```
GET    /api/v1/vehicles
POST   /api/v1/vehicles
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id

GET    /api/v1/customers
POST   /api/v1/customers

GET    /api/v1/rentals
POST   /api/v1/rentals
GET    /api/v1/rentals/:id
PATCH  /api/v1/rentals/:id/status

POST   /api/v1/rentals/:id/inspections/:type
POST   /api/v1/inspections/:id/photos
PATCH  /api/v1/inspections/:id/complete

POST   /api/v1/rentals/:id/compare
GET    /api/v1/rentals/:id/comparison

GET    /api/v1/dashboard/fleet-stats

GET    /api/v1/rentals/:id/report/pdf

GET    /api/v1/positions
POST   /api/v1/positions
DELETE /api/v1/positions/:id

GET    /api/v1/images/:filename
```
