import os
import sys

# Add the parent directory to sys.path to ensure 'app' can be imported 
# properly when executing main.py directly
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import uvicorn
from app.interfaces.api import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "True").lower() == "true"
    
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
