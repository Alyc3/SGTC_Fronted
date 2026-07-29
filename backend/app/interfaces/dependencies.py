from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..infrastructure.persistence.database import get_db
from ..infrastructure.persistence.repositories import SQLAlchemyAnalysisRepository
from ..infrastructure.file_storage.local_storage import LocalFileStorage
from ..application.services import SubmitVideoAnalysis, GetAnalysisResult, ListAnalyses

def get_analysis_repository(db: AsyncSession = Depends(get_db)) -> SQLAlchemyAnalysisRepository:
    return SQLAlchemyAnalysisRepository(db)

def get_file_storage() -> LocalFileStorage:
    return LocalFileStorage()

def get_task_trigger():
    def trigger(analysis_id: str):
        # Delayed import to avoid circular dependency loop during startup
        from app.application.tasks import analyze_video_task
        analyze_video_task.delay(analysis_id)
    return trigger

def get_submit_video_analysis_service(
    repo: SQLAlchemyAnalysisRepository = Depends(get_analysis_repository),
    storage: LocalFileStorage = Depends(get_file_storage),
    trigger = Depends(get_task_trigger)
) -> SubmitVideoAnalysis:
    return SubmitVideoAnalysis(repo, storage, trigger)

def get_analysis_result_service(
    repo: SQLAlchemyAnalysisRepository = Depends(get_analysis_repository)
) -> GetAnalysisResult:
    return GetAnalysisResult(repo)

def get_list_analyses_service(
    repo: SQLAlchemyAnalysisRepository = Depends(get_analysis_repository)
) -> ListAnalyses:
    return ListAnalyses(repo)
