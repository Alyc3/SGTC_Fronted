class DomainException(Exception):
    """Base class for all domain exceptions"""
    pass

class AnalysisNotFoundError(DomainException):
    def __init__(self, analysis_id: str):
        self.analysis_id = analysis_id
        super().__init__(f"Analysis with ID {analysis_id} not found.")

class InvalidVideoFileError(DomainException):
    def __init__(self, message: str):
        super().__init__(f"Invalid video file: {message}")

class VideoProcessingError(DomainException):
    def __init__(self, message: str):
        super().__init__(f"Video processing failed: {message}")

class ModelInferenceError(DomainException):
    def __init__(self, message: str):
        super().__init__(f"Model inference failed: {message}")
