import os
import uuid
import aiofiles
import logging
from ...domain.ports import FileStoragePort

logger = logging.getLogger(__name__)

class LocalFileStorage(FileStoragePort):
    def __init__(self):
        # Configurable uploads directory, falling back to /app/uploads
        self.upload_dir = os.getenv("UPLOAD_DIR", "/app/uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file_content: bytes, filename: str) -> str:
        """Saves file content to disk and returns a relative storage path."""
        unique_id = uuid.uuid4().hex
        ext = os.path.splitext(filename)[1]
        # Keep extension lowercase
        stored_filename = f"{unique_id}{ext.lower()}"
        
        # Define relative storage path starting with 'uploads/'
        relative_path = os.path.join("uploads", stored_filename)
        absolute_path = self.get_absolute_path(relative_path)
        
        # Ensure target directory exists
        os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

        async with aiofiles.open(absolute_path, "wb") as f:
            await f.write(file_content)
            
        logger.info(f"Saved uploaded file '{filename}' as '{absolute_path}'")
        return relative_path

    async def delete_file(self, storage_path: str) -> None:
        """Removes a file from disk if it exists."""
        absolute_path = self.get_absolute_path(storage_path)
        if os.path.exists(absolute_path):
            try:
                os.remove(absolute_path)
                logger.info(f"Deleted file '{absolute_path}'")
            except Exception as e:
                logger.warning(f"Failed to delete file '{absolute_path}': {e}")

    def get_absolute_path(self, storage_path: str) -> str:
        """Resolves storage_path relative to upload_dir and returns the absolute path."""
        if os.path.isabs(storage_path):
            return storage_path
            
        # Standardize prefix stripping
        if storage_path.startswith("uploads/"):
            parts = storage_path.split("uploads/", 1)[1]
            return os.path.join(self.upload_dir, parts)
        elif storage_path.startswith("uploads\\"):
            parts = storage_path.split("uploads\\", 1)[1]
            return os.path.join(self.upload_dir, parts)
            
        return os.path.join(self.upload_dir, storage_path)
