# Car Rental Damage Detector — Design Spec
**Date:** 2026-05-26  
**Status:** Approved  
**Stack:** FastAPI · React · MySQL · Groq Vision AI

---

## 1. Overview

A complete pivot of the existing DamageAI app into a **car rental damage detection platform**. The owner of a car rental business uses this to inspect vehicles before and after every rental, compare the photos with AI, and generate a damage report.

**Single operator:** Only the car rental owner uses the system. No customer portal.  
**Responsive:** Works on mobile (phone camera) and desktop (file upload).  
**AI:** Groq Vision compares before/after photo pairs per position and detects new damage.

---

## 2. Core Concepts

```
Vehicle  →  Rental  →  Pre-Inspection (photos)  →  [Car Out]  →  Post-Inspection (photos)  →  AI Comparison  →  Report
```

### Rental Lifecycle States
| State | Meaning |
|---|---|
| `pre_inspection_pending` | Rental created, pre-inspection not yet done |
| `pre_inspection_done` | Pre-inspection complete, car ready to go out |
| `rented_out` | Car handed to customer |
| `post_inspection_pending` | Car returned, post-inspection not yet done |
| `comparing` | AI comparison running |
| `completed` | Comparison done, report available |

---

## 3. Data Model

### `vehicles`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| make | VARCHAR | e.g. Toyota |
| model | VARCHAR | e.g. Camry |
| year | INT | |
| color | VARCHAR | |
| plate_number | VARCHAR UNIQUE | |
| category | ENUM | sedan, suv, hatchback, van, other |
| status | ENUM | available, rented_out |
| created_at | DATETIME | |

### `customers`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| full_name | VARCHAR | |
| phone | VARCHAR | |
| email | VARCHAR | nullable |
| id_number | VARCHAR | license or national ID |
| created_at | DATETIME | |

### `rentals`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| vehicle_id | INT FK | |
| customer_id | INT FK | |
| start_date | DATE | |
| expected_return_date | DATE | |
| actual_return_date | DATE | nullable |
| status | ENUM | See lifecycle states above |
| notes | TEXT | nullable |
| created_at | DATETIME | |

### `inspection_positions`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| name | VARCHAR | e.g. "Front", "Rear Left Corner" |
| sort_order | INT | display order |
| is_default | BOOLEAN | pre-seeded defaults |

**Default 15 positions (seeded):**
Front · Front-Left Corner · Left Side · Rear-Left Corner · Rear · Rear-Right Corner · Right Side · Front-Right Corner · Roof · Dashboard · Odometer · Front Interior · Rear Interior · Trunk · Engine Bay

### `inspections`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| rental_id | INT FK | |
| type | ENUM | pre, post |
| status | ENUM | in_progress, completed |
| created_at | DATETIME | |

### `inspection_photos`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| inspection_id | INT FK | |
| position_id | INT FK | |
| image_path | VARCHAR | stored file path |
| created_at | DATETIME | |

### `comparison_results`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| rental_id | INT FK UNIQUE | one result per rental |
| overall_status | ENUM | clean, damaged, uncertain |
| damage_count | INT | number of positions with new damage |
| summary | TEXT | AI-generated overall summary |
| report_path | VARCHAR | nullable, PDF file path |
| created_at | DATETIME | |

### `comparison_items`
| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| comparison_id | INT FK | |
| position_id | INT FK | |
| pre_photo_id | INT FK | |
| post_photo_id | INT FK | |
| status | ENUM | new_damage, no_change, uncertain |
| confidence | FLOAT | 0–100 |
| damage_types | JSON | array of strings |
| explanation | TEXT | |
| bounding_boxes | JSON | on the post photo |

---

## 4. Pages & Flows

### 4.1 Fleet Dashboard (`/`)
- 4 stat cards: Available · Rented Out · Awaiting Inspection · Damage This Month
- Vehicle grid with status badge and contextual action button per card
- Filter chips: All / Available / Rented Out / Awaiting Return
- Recent rentals table at bottom

### 4.2 Vehicles (`/vehicles`)
- List of all vehicles with plate, model, status
- Add / Edit / Delete vehicle
- Each row links to vehicle detail (rental history for that car)

### 4.3 New Rental Wizard (`/rentals/new`)
**Step 1 — Pick Vehicle:** Grid of available vehicles only  
**Step 2 — Customer Details:** Name, phone, email (optional), ID/license number  
**Step 3 — Rental Dates:** Start date, expected return date, notes  
**Step 4 — Confirm:** Summary screen → "Start Pre-Inspection" button

### 4.4 Inspection Wizard (`/rentals/:id/inspect/:type`)
- Same wizard for both pre and post inspection
- Shows positions one at a time: position name + diagram hint
- Owner takes/uploads a photo per position
- Progress bar showing X / 15 complete
- Owner can add extra positions or skip non-applicable ones
- "Complete Inspection" button at end

### 4.5 Rental Detail (`/rentals/:id`)
- Customer + vehicle info header
- Pre-inspection photo grid (thumbnails per position)
- Post-inspection photo grid (if done)
- Comparison result section (if done)
- Timeline of status changes

### 4.6 Comparison Result (`/rentals/:id/comparison`)
- Overall verdict banner: Clean Return / Damage Found / Uncertain
- Per-position cards: before photo | after photo side by side
- Positions with new damage highlighted in red with bounding boxes on the after photo
- AI explanation per position
- "Generate PDF Report" button

### 4.7 Rental History (`/rentals`)
- Table of all rentals, sortable by date
- Filters: date range, vehicle, damage status
- Each row links to rental detail

### 4.8 PDF Report
- Generated server-side
- Contains: customer details, vehicle details, rental dates, per-position before/after photos, AI verdicts, overall result
- Downloadable from comparison result page

---

## 5. AI Comparison Engine

### Change from current app
**Before:** Single image → "is this damaged?"  
**After:** Two images (same position, before & after) → "has NEW damage appeared?"

### New prompt
```
You are a vehicle damage inspector. You are given two photos of the same part of a car:
- BEFORE: taken before the rental
- AFTER: taken after the rental was returned

Determine whether NEW damage has appeared during the rental.

Respond with ONLY valid JSON:
{
  "status": "new_damage" | "no_change" | "uncertain",
  "confidence": <integer 0-100>,
  "damage_types": ["scratch","dent","crack","burn","stain","other"],
  "explanation": "<professional 2-3 sentence assessment>",
  "bounding_boxes": [[ymin, xmin, ymax, xmax]]
}

Rules:
- bounding_boxes are on the AFTER image only, as float percentages 0–100
- bounding_boxes must be [] if status is not "new_damage"
- damage_types must be [] if status is not "new_damage"
- Pre-existing damage visible in BEFORE photo must NOT be flagged as new
```

### Comparison flow
1. Post-inspection completed → trigger comparison job
2. For each position that has BOTH a pre photo AND a post photo: send both to AI
3. Positions with only a pre photo (skipped on return) are stored as `no_change` with 100% confidence
4. Store result per position in `comparison_items`
5. Roll up overall status: if any position = `new_damage` → overall = `damaged`
6. Update `comparison_results.overall_status`
7. Update rental status → `completed`

---

## 6. What Changes vs Current App

| Current | New |
|---|---|
| Dashboard (generic stats) | Fleet Dashboard (car cards) |
| Analyse page (single image) | New Rental Wizard |
| Batch page | Inspection Wizard |
| Compare page | Comparison Result per rental |
| History page | Rental History |
| — | Vehicles page (new) |
| Single-image AI prompt | Before/after comparison prompt |
| `analyses` table | `rentals`, `inspections`, `inspection_photos`, `comparison_results`, `comparison_items` |
| `batches` table | replaced by `rentals` |

Old tables (`analyses`, `batches`) are dropped. Old routes (`/damage/*`) are replaced with new ones.

---

## 7. API Routes (new)

```
# Vehicles
GET    /api/v1/vehicles
POST   /api/v1/vehicles
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id

# Customers
GET    /api/v1/customers
POST   /api/v1/customers

# Rentals
GET    /api/v1/rentals
POST   /api/v1/rentals
GET    /api/v1/rentals/:id
PATCH  /api/v1/rentals/:id/status

# Inspections
POST   /api/v1/rentals/:id/inspections/:type
POST   /api/v1/inspections/:id/photos
PATCH  /api/v1/inspections/:id/complete

# Comparison
POST   /api/v1/rentals/:id/compare
GET    /api/v1/rentals/:id/comparison

# Dashboard
GET    /api/v1/dashboard/fleet-stats

# Report
GET    /api/v1/rentals/:id/report/pdf

# Positions
GET    /api/v1/positions
POST   /api/v1/positions
DELETE /api/v1/positions/:id

# Static images
GET    /api/v1/images/:filename
```

---

## 8. Tech Decisions

- **PDF generation:** `weasyprint` (Python) — renders HTML template to PDF server-side
- **Image storage:** Local `storage/images/` directory (same as current)
- **Comparison trigger:** Synchronous on `POST /compare` — no queue needed at this scale
- **Mobile photo capture:** `<input type="file" accept="image/*" capture="environment">` — native camera on mobile, file picker on desktop
- **Frontend routing:** React Router (already installed)
- **No auth changes:** Single owner, no login required (same as current)
