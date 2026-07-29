from uuid import UUID
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ...domain.entities import Analysis
from ...domain.ports import AnalysisRepository
from ...domain.value_objects import AnalysisStatus
from .models import AnalysisModel

def to_domain(model: AnalysisModel) -> Analysis:
    """Map SQLAlchemy database model to domain entity."""
    return Analysis(
        id=model.id,
        original_filename=model.original_filename,
        storage_path=model.storage_path,
        duration=model.duration,
        status=model.status,
        deepfake_score=model.deepfake_score,
        segments_result=model.segments_result,
        created_at=model.created_at,
        updated_at=model.updated_at
    )

def to_persistence(entity: Analysis) -> AnalysisModel:
    """Map domain entity to SQLAlchemy database model."""
    return AnalysisModel(
        id=entity.id,
        original_filename=entity.original_filename,
        storage_path=entity.storage_path,
        duration=entity.duration,
        status=entity.status,
        deepfake_score=entity.deepfake_score,
        segments_result=entity.segments_result,
        created_at=entity.created_at,
        updated_at=entity.updated_at
    )

class SQLAlchemyAnalysisRepository(AnalysisRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, analysis: Analysis) -> Analysis:
        stmt = select(AnalysisModel).where(AnalysisModel.id == analysis.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if model:
            # Update existing record
            model.original_filename = analysis.original_filename
            model.storage_path = analysis.storage_path
            model.duration = analysis.duration
            model.status = analysis.status
            model.deepfake_score = analysis.deepfake_score
            model.segments_result = analysis.segments_result
            model.updated_at = analysis.updated_at
        else:
            # Insert new record
            model = to_persistence(analysis)
            self.session.add(model)
            
        await self.session.commit()
        # Keep entity timestamps in sync
        analysis.created_at = model.created_at
        analysis.updated_at = model.updated_at
        return analysis

    async def get_by_id(self, id: UUID) -> Optional[Analysis]:
        stmt = select(AnalysisModel).where(AnalysisModel.id == id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            return to_domain(model)
        return None

    async def list_all(
        self,
        status: Optional[AnalysisStatus] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Analysis]:
        stmt = select(AnalysisModel)
        if status:
            stmt = stmt.where(AnalysisModel.status == status)
        if min_score is not None:
            stmt = stmt.where(AnalysisModel.deepfake_score >= min_score)
        if max_score is not None:
            stmt = stmt.where(AnalysisModel.deepfake_score <= max_score)
            
        # Order by created_at descending by default
        stmt = stmt.order_by(AnalysisModel.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [to_domain(m) for m in models]
