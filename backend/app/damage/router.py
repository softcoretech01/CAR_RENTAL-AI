from __future__ import annotations
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pathlib import Path
from app.config import settings
from app.database import get_db
from app.damage import crud, service
from app.damage.schemas import AnalysisOut, BatchOut, FeedbackUpdate, WebcamRequest

router = APIRouter(prefix="/damage", tags=["Damage Detection"])

ALLOWED = {"image/jpeg","image/jpg","image/png","image/webp","image/gif"}

def db():
    with get_db() as conn:
        yield conn

@router.post("/analyse", response_model=AnalysisOut, status_code=201)
def analyse(file: UploadFile = File(...), conn=Depends(db)):
    if file.content_type not in ALLOWED:
        raise HTTPException(415, f"Unsupported type: {file.content_type}")
    try:
        few_shots = crud.get_few_shot_examples(conn)
        ai, filename = service.process_upload(file, few_shots)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")
    return crud.create_analysis(conn, image_path=filename,
        original_name=file.filename, source="upload",
        status=ai["status"], confidence=ai["confidence"],
        severity=ai["severity"], damage_types=ai["damage_types"],
        region_description=ai.get("region_description"),
        explanation=ai.get("explanation"),
        is_flagged=service.is_flagged(ai["confidence"]), batch_id=None,
        bounding_boxes=ai.get("bounding_boxes"))

@router.post("/analyse/webcam", response_model=AnalysisOut, status_code=201)
def analyse_webcam(body: WebcamRequest, conn=Depends(db)):
    try:
        few_shots = crud.get_few_shot_examples(conn)
        ai, filename = service.process_base64(body.image_data, body.original_name, few_shots)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")
    return crud.create_analysis(conn, image_path=filename,
        original_name=body.original_name, source="webcam",
        status=ai["status"], confidence=ai["confidence"],
        severity=ai["severity"], damage_types=ai["damage_types"],
        region_description=ai.get("region_description"),
        explanation=ai.get("explanation"),
        is_flagged=service.is_flagged(ai["confidence"]), batch_id=None,
        bounding_boxes=ai.get("bounding_boxes"))

@router.post("/batch", response_model=BatchOut, status_code=201)
def create_batch(label: str | None = Query(default=None), conn=Depends(db)):
    return crud.create_batch(conn, label)

@router.post("/batch/{batch_id}/analyse", response_model=AnalysisOut, status_code=201)
def batch_analyse(batch_id: int, file: UploadFile = File(...), conn=Depends(db)):
    if not crud.get_batch(conn, batch_id):
        raise HTTPException(404, "Batch not found")
    if file.content_type not in ALLOWED:
        raise HTTPException(415, f"Unsupported type: {file.content_type}")
    try:
        few_shots = crud.get_few_shot_examples(conn)
        ai, filename = service.process_upload(file, few_shots)
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")
    row = crud.create_analysis(conn, image_path=filename,
        original_name=file.filename, source="batch",
        status=ai["status"], confidence=ai["confidence"],
        severity=ai["severity"], damage_types=ai["damage_types"],
        region_description=ai.get("region_description"),
        explanation=ai.get("explanation"),
        is_flagged=service.is_flagged(ai["confidence"]), batch_id=batch_id,
        bounding_boxes=ai.get("bounding_boxes"))
    crud.refresh_batch_counts(conn, batch_id)
    return row

@router.get("/history", response_model=list[AnalysisOut])
def history(status: str|None=Query(None), severity: str|None=Query(None),
            flagged: bool|None=Query(None), batch_id: int|None=Query(None),
            limit: int=Query(20,ge=1,le=200), offset: int=Query(0,ge=0), conn=Depends(db)):
    return crud.list_analyses(conn, status=status, severity=severity,
                              is_flagged=flagged, batch_id=batch_id, limit=limit, offset=offset)

@router.get("/analyses/{aid}", response_model=AnalysisOut)
def get_analysis(aid: int, conn=Depends(db)):
    row = crud.get_analysis(conn, aid)
    if not row: raise HTTPException(404, "Not found")
    return row

@router.patch("/analyses/{aid}/feedback", response_model=AnalysisOut)
def feedback(aid: int, body: FeedbackUpdate, conn=Depends(db)):
    if body.feedback not in ("correct","incorrect"):
        raise HTTPException(400, "Must be correct or incorrect")
    row = crud.update_feedback(conn, aid, body.feedback)
    if not row: raise HTTPException(404, "Not found")
    return row

@router.delete("/analyses/{aid}", status_code=204)
def delete(aid: int, conn=Depends(db)):
    n, path = crud.delete_analysis(conn, aid)
    if not n: raise HTTPException(404, "Not found")
    if path: service.delete_file(path)

@router.get("/batches", response_model=list[BatchOut])
def list_batches(limit: int=Query(20,ge=1,le=200), offset: int=Query(0,ge=0), conn=Depends(db)):
    return crud.list_batches(conn, limit=limit, offset=offset)

@router.get("/batches/{bid}")
def get_batch(bid: int, conn=Depends(db)):
    b = crud.get_batch(conn, bid)
    if not b: raise HTTPException(404, "Not found")
    analyses = crud.list_analyses(conn, batch_id=bid, limit=200)
    return {"batch": b, "analyses": analyses}

@router.get("/stats")
def stats(conn=Depends(db)):
    return crud.get_stats(conn)

@router.get("/images/{filename}")
def image(filename: str):
    p = Path(settings.DAMAGE_STORAGE_DIR) / filename
    if not p.exists(): raise HTTPException(404, "Image not found")
    return FileResponse(p)
