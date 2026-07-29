from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

def create_app() -> FastAPI:
    app = FastAPI(
        title="Deepfake Detection API",
        description="Robust backend API for lip-sync deepfake detection using the HuggingFace LipFD model.",
        version="1.0.0",
        docs_url="/docs",      # Swagger UI
        redoc_url="/redoc",    # ReDoc UI (specifically requested)
    )
    
    # Setup CORS middleware to allow the ElectronJS desktop client to connect
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],   # Allows access from electron files or dev servers
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include all API routes without a prefix so they match the requested endpoints directly
    app.include_router(router)
    
    return app
