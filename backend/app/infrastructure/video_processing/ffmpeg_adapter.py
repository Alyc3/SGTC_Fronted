import os
import asyncio
import logging
from typing import Dict, Any, List
from ...domain.ports import VideoProcessor
from ...domain.exceptions import VideoProcessingError

logger = logging.getLogger(__name__)

class FFmpegVideoProcessor(VideoProcessor):
    async def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Runs ffprobe to fetch video metadata like duration."""
        if not os.path.exists(file_path):
            raise VideoProcessingError(f"Video file does not exist: {file_path}")

        cmd = [
            "ffprobe", "-v", "error", 
            "-show_entries", "format=duration", 
            "-of", "default=noprint_wrappers=1:nokey=1", 
            file_path
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                duration_str = stdout.decode().strip()
                try:
                    duration = float(duration_str)
                    return {"duration": duration}
                except ValueError:
                    logger.warning(f"Could not parse duration '{duration_str}'. Using default 10.0.")
            else:
                logger.warning(f"ffprobe failed with code {process.returncode}: {stderr.decode()}")
        except FileNotFoundError:
            logger.warning("ffprobe command not found. Using fallback metadata duration of 10.0s.")
        except Exception as e:
            logger.warning(f"Error querying video metadata via ffprobe: {e}")

        # Fallback duration if ffprobe is not installed or fails
        return {"duration": 10.0, "fallback": True}

    async def extract_audio(self, file_path: str, output_audio_path: str) -> bool:
        """Extracts mono 16kHz audio from a video using ffmpeg."""
        if not os.path.exists(file_path):
            return False

        # Command to extract audio stream to WAV
        cmd = [
            "ffmpeg", "-y", "-i", file_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            output_audio_path
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info(f"Successfully extracted audio to: {output_audio_path}")
                return True
            else:
                logger.warning(f"ffmpeg audio extraction failed (video may not contain an audio track): {stderr.decode()}")
                return False
        except FileNotFoundError:
            logger.warning("ffmpeg command not found. Skipping audio extraction.")
            return False
        except Exception as e:
            logger.error(f"Error during audio extraction: {e}")
            return False

    async def extract_frames(self, file_path: str, output_dir: str, fps: int = 1) -> List[str]:
        """Extracts frames from video using ffmpeg at a specific frame rate."""
        if not os.path.exists(file_path):
            return []

        os.makedirs(output_dir, exist_ok=True)
        output_pattern = os.path.join(output_dir, "frame_%04d.png")
        
        cmd = [
            "ffmpeg", "-y", "-i", file_path,
            "-vf", f"fps={fps}",
            output_pattern
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                frames = [
                    os.path.join(output_dir, f)
                    for f in sorted(os.listdir(output_dir))
                    if f.startswith("frame_") and f.endswith(".png")
                ]
                logger.info(f"Extracted {len(frames)} frames to {output_dir}")
                return frames
            else:
                raise VideoProcessingError(f"ffmpeg frame extraction failed: {stderr.decode()}")
        except FileNotFoundError:
            logger.warning("ffmpeg command not found. Cannot extract frames.")
            return []
        except Exception as e:
            raise VideoProcessingError(f"Frame extraction failed: {e}")
