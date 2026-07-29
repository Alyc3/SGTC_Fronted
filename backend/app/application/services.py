from uuid import UUID
from typing import List, Optional
from ..domain.entities import Analysis
from ..domain.ports import AnalysisRepository, FileStoragePort
from ..domain.value_objects import AnalysisStatus
from ..domain.exceptions import AnalysisNotFoundError

class SubmitVideoAnalysis:
    def __init__(
        self,
        repository: AnalysisRepository,
        storage: FileStoragePort,
        trigger_task_fn
    ):
        self.repository = repository
        self.storage = storage
        self.trigger_task_fn = trigger_task_fn

    async def execute(self, file_content: bytes, filename: str) -> Analysis:
        # Save the file using the storage adapter
        storage_path = await self.storage.save_file(file_content, filename)
        
        # Create a new analysis entity with PENDING status
        analysis = Analysis(
            original_filename=filename,
            storage_path=storage_path,
            status=AnalysisStatus.PENDING
        )
        
        # Save to database
        saved_analysis = await self.repository.save(analysis)
        
        # Trigger Celery task (or whatever background worker process is configured)
        self.trigger_task_fn(str(saved_analysis.id))
        
        return saved_analysis


class GetAnalysisResult:
    def __init__(self, repository: AnalysisRepository):
        self.repository = repository

    async def execute(self, analysis_id: UUID) -> Analysis:
        analysis = await self.repository.get_by_id(analysis_id)
        if not analysis:
            raise AnalysisNotFoundError(str(analysis_id))
        return analysis


class ListAnalyses:
    def __init__(self, repository: AnalysisRepository):
        self.repository = repository

    async def execute(
        self,
        status: Optional[str] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Analysis]:
        domain_status = None
        if status:
            domain_status = AnalysisStatus(status)
            
        return await self.repository.list_all(
            status=domain_status,
            min_score=min_score,
            max_score=max_score,
            limit=limit,
            offset=offset
        )
