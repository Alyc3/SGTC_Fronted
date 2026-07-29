from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from .entities import Analysis
from .value_objects import AnalysisStatus

class AnalysisRepository(ABC):
    @abstractmethod
    async def save(self, analysis: Analysis) -> Analysis:
        pass

    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[Analysis]:
        pass

    @abstractmethod
    async def list_all(
        self,
        status: Optional[AnalysisStatus] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Analysis]:
        pass

class FileStoragePort(ABC):
    @abstractmethod
    async def save_file(self, file_content: bytes, filename: str) -> str:
        """Saves file content and returns the storage path."""
        pass

    @abstractmethod
    async def delete_file(self, storage_path: str) -> None:
        """Deletes file from storage."""
        pass

    @abstractmethod
    def get_absolute_path(self, storage_path: str) -> str:
        """Gets absolute path of the file."""
        pass

class VideoProcessor(ABC):
    @abstractmethod
    async def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extracts duration, format, frame rate, resolution, etc."""
        pass

    @abstractmethod
    async def extract_audio(self, file_path: str, output_audio_path: str) -> bool:
        """Extracts audio channel as wav."""
        pass

    @abstractmethod
    async def extract_frames(self, file_path: str, output_dir: str, fps: int = 1) -> List[str]:
        """Extracts frames as images at specific fps."""
        pass

class ModelInferencePort(ABC):
    @abstractmethod
    async def run_inference(self, video_path: str, audio_path: Optional[str] = None) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Runs LipFD inference on video (and extracted audio).
        Returns global score (0 to 1) and metadata of segments.
        """
        pass
