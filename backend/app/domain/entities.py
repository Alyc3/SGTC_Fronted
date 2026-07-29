from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional, List, Dict, Any
from .value_objects import AnalysisStatus

class Analysis:
    def __init__(
        self,
        id: Optional[UUID] = None,
        original_filename: str = "",
        storage_path: str = "",
        duration: Optional[float] = None,
        status: AnalysisStatus = AnalysisStatus.PENDING,
        deepfake_score: Optional[float] = None,
        segments_result: Optional[List[Dict[str, Any]]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.id = id or uuid4()
        self.original_filename = original_filename
        self.storage_path = storage_path
        self.duration = duration
        self.status = status
        self.deepfake_score = deepfake_score
        self.segments_result = segments_result or []
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def start_processing(self):
        self.status = AnalysisStatus.PROCESSING
        self.updated_at = datetime.utcnow()

    def complete(self, score: float, segments: List[Dict[str, Any]], duration: float):
        self.status = AnalysisStatus.COMPLETED
        self.deepfake_score = score
        self.segments_result = segments
        self.duration = duration
        self.updated_at = datetime.utcnow()

    def fail(self):
        self.status = AnalysisStatus.FAILED
        self.updated_at = datetime.utcnow()
