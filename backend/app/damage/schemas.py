from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class BatchOut(BaseModel):
    id: int
    label: Optional[str]
    total_count: int
    damaged_count: int
    not_damaged_count: int
    flagged_count: int
    created_at: str
    model_config = {"from_attributes": True}

class AnalysisOut(BaseModel):
    id: int
    image_path: str
    original_name: Optional[str]
    source: str
    status: str
    confidence: float
    severity: str
    damage_types: list[str]
    region_description: Optional[str]
    explanation: Optional[str]
    is_flagged: bool
    batch_id: Optional[int]
    user_feedback: Optional[str]
    bounding_boxes: list[list[float]] = []
    created_at: str
    model_config = {"from_attributes": True}

class FeedbackUpdate(BaseModel):
    feedback: str

class WebcamRequest(BaseModel):
    image_data: str
    original_name: str = "webcam_capture.jpg"
