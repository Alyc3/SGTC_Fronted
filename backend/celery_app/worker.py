import os
import sys

# Add the parent directory of celery_app (the backend folder) to Python path
# to allow absolute imports like 'app.application.tasks' inside workers
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from celery import Celery

# Create the Celery app instance
celery_app = Celery("deepfake_detection")

# Configure Celery using celeryconfig.py
celery_app.config_from_object("celery_app.celeryconfig")

if __name__ == "__main__":
    celery_app.start()
