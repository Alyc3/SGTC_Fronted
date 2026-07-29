from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SegmentResultSchema(BaseModel):
    segment_index: int
    start_time: float
    end_time: float
    deepfake_score: float
    status: str
    audio_visual_sync_error: float

class AnalysisResponseSchema(BaseModel):
    id: UUID
    original_filename: str
    storage_path: str
    duration: Optional[float] = None
    status: str
    deepfake_score: Optional[float] = None
    segments_result: List[SegmentResultSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
