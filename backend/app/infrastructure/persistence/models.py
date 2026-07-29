import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from ...domain.value_objects import AnalysisStatus

class Base(DeclarativeBase):
    pass

class AnalysisModel(Base):
    __tablename__ = "analysis"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=True)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, name="analysis_status_enum"),
        nullable=False,
        default=AnalysisStatus.PENDING
    )
    deepfake_score: Mapped[float] = mapped_column(Float, nullable=True)
    segments_result: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
