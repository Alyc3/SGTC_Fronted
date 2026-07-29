from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, status
from uuid import UUID
from typing import List, Optional
from .schemas import AnalysisResponseSchema
from .dependencies import (
    get_submit_video_analysis_service,
    get_analysis_result_service,
    get_list_analyses_service
)
from ..application.services import SubmitVideoAnalysis, GetAnalysisResult, ListAnalyses
from ..domain.exceptions import AnalysisNotFoundError, InvalidVideoFileError
import os

router = APIRouter()

# Max size default: 500 MB
MAX_VIDEO_SIZE_BYTES = int(os.getenv("MAX_VIDEO_SIZE_BYTES", 500 * 1024 * 1024))

@router.post("/analyses", response_model=AnalysisResponseSchema, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    service: SubmitVideoAnalysis = Depends(get_submit_video_analysis_service)
):
    # Validate extension (support standard mp4 and other common containers)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: mp4, avi, mov, mkv."
        )

    # Pre-check size using Content-Length headers if available
    content_length = file.headers.get("content-length")
    if content_length and int(content_length) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size limit of {MAX_VIDEO_SIZE_BYTES / (1024*1024):.1f} MB."
        )

    # Read and enforce size limit
    contents = await file.read()
    if len(contents) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size limit of {MAX_VIDEO_SIZE_BYTES / (1024*1024):.1f} MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        analysis = await service.execute(contents, file.filename)
        return analysis
    except InvalidVideoFileError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to submit analysis: {str(e)}")


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponseSchema)
async def get_analysis(
    analysis_id: UUID,
    service: GetAnalysisResult = Depends(get_analysis_result_service)
):
    try:
        analysis = await service.execute(analysis_id)
        return analysis
    except AnalysisNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving analysis: {str(e)}")


@router.get("/analyses", response_model=List[AnalysisResponseSchema])
async def list_analyses(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (pending, processing, completed, failed)"),
    min_score: Optional[float] = Query(None, description="Minimum deepfake score (0.0 to 1.0)"),
    max_score: Optional[float] = Query(None, description="Maximum deepfake score (0.0 to 1.0)"),
    limit: int = Query(50, ge=1, le=100, description="Limit results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    service: ListAnalyses = Depends(get_list_analyses_service)
):
    try:
        analyses = await service.execute(
            status=status_filter,
            min_score=min_score,
            max_score=max_score,
            limit=limit,
            offset=offset
        )
        return analyses
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error listing analyses: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check validating both web api layers and database connection."""
    from ..infrastructure.persistence.database import engine
    from sqlalchemy import text
    
    db_status = "healthy"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    return {
        "status": "healthy" if "unhealthy" not in db_status else "unhealthy",
        "database": db_status
    }
