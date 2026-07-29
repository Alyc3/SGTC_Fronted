import asyncio
import logging
from uuid import UUID
from celery.exceptions import MaxRetriesExceededError
from celery_app.worker import celery_app
from ..domain.exceptions import VideoProcessingError, ModelInferenceError
from ..domain.value_objects import AnalysisStatus

logger = logging.getLogger(__name__)

def run_async(coro):
    """Helper to run async coroutine synchronously in Celery worker."""
    try:
        return asyncio.run(coro)
    except RuntimeError:
        # Fallback if an event loop is already running in this thread
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply(loop)
            return loop.run_until_complete(coro)
        else:
            return loop.run_until_complete(coro)

@celery_app.task(
    bind=True,
    name="app.application.tasks.analyze_video_task",
    max_retries=3,
    default_retry_delay=15
)
def analyze_video_task(self, analysis_id_str: str):
    logger.info(f"Starting Celery task for Analysis ID: {analysis_id_str}")
    try:
        return run_async(async_analyze_video(self, analysis_id_str))
    except Exception as exc:
        logger.exception(f"Exception encountered in task for Analysis ID {analysis_id_str}")
        
        # Ensure status is marked as failed if database is accessible
        try:
            run_async(async_mark_failed(analysis_id_str))
        except Exception as db_exc:
            logger.error(f"Failed to write FAILED status to DB: {db_exc}")
            
        # Retry only for transient issues (network, out-of-memory, etc.)
        if isinstance(exc, (ModelInferenceError, VideoProcessingError)):
            try:
                raise self.retry(exc=exc)
            except MaxRetriesExceededError:
                logger.error(f"Max retries exceeded for Analysis ID {analysis_id_str}")
        raise exc

async def async_analyze_video(task_instance, analysis_id_str: str):
    # Lazy imports to avoid circular dependencies
    from ..infrastructure.persistence.database import get_db_context
    from ..infrastructure.persistence.repositories import SQLAlchemyAnalysisRepository
    from ..infrastructure.video_processing.ffmpeg_adapter import FFmpegVideoProcessor
    from ..infrastructure.model_inference.lipfd_adapter import LipFDAdapter
    from ..infrastructure.file_storage.local_storage import LocalFileStorage
    import os
    
    analysis_id = UUID(analysis_id_str)
    
    async with get_db_context() as db_session:
        repo = SQLAlchemyAnalysisRepository(db_session)
        analysis = await repo.get_by_id(analysis_id)
        if not analysis:
            logger.error(f"Analysis {analysis_id} not found in database.")
            return
            
        # Transition status to PROCESSING
        analysis.start_processing()
        await repo.save(analysis)
        
        # Instantiate infrastructure adapters
        storage = LocalFileStorage()
        video_processor = FFmpegVideoProcessor()
        model_inference = LipFDAdapter()
        
        absolute_video_path = storage.get_absolute_path(analysis.storage_path)
        
        if not os.path.exists(absolute_video_path):
            raise VideoProcessingError(f"Video file not found on disk at: {absolute_video_path}")
            
        audio_path_arg = None
        try:
            # 1. Extract metadata to get video duration
            metadata = await video_processor.get_metadata(absolute_video_path)
            duration = float(metadata.get("duration", 0.0))
            
            # 2. Extract audio track (needed by audio-visual LipFD model)
            base_dir = os.path.dirname(absolute_video_path)
            audio_filename = f"{analysis_id}.wav"
            absolute_audio_path = os.path.join(base_dir, audio_filename)
            
            has_audio = await video_processor.extract_audio(absolute_video_path, absolute_audio_path)
            if has_audio:
                audio_path_arg = absolute_audio_path
                
            # 3. Perform model inference
            logger.info(f"Calling LipFD model inference adapter...")
            score, segments = await model_inference.run_inference(
                video_path=absolute_video_path,
                audio_path=audio_path_arg
            )
            
            # 4. Save results back to database
            analysis.complete(score=score, segments=segments, duration=duration)
            await repo.save(analysis)
            logger.info(f"Successfully processed Analysis ID {analysis_id}. Score: {score}")
            
        except Exception as e:
            logger.error(f"Pipeline failure for Analysis ID {analysis_id}: {str(e)}")
            analysis.fail()
            await repo.save(analysis)
            raise e
        finally:
            # Clean up temp audio file
            if audio_path_arg and os.path.exists(audio_path_arg):
                try:
                    os.remove(audio_path_arg)
                    logger.debug(f"Deleted temporary audio file at {audio_path_arg}")
                except Exception as cleanup_err:
                    logger.warning(f"Could not delete temporary audio file {audio_path_arg}: {cleanup_err}")

async def async_mark_failed(analysis_id_str: str):
    from ..infrastructure.persistence.database import get_db_context
    from ..infrastructure.persistence.repositories import SQLAlchemyAnalysisRepository
    
    analysis_id = UUID(analysis_id_str)
    async with get_db_context() as db_session:
        repo = SQLAlchemyAnalysisRepository(db_session)
        analysis = await repo.get_by_id(analysis_id)
        if analysis and analysis.status != AnalysisStatus.COMPLETED:
            analysis.fail()
            await repo.save(analysis)
