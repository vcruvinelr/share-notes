import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, mongo_db
from app.routes import notes, subscription, websocket

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting application...")

    # Connect to MongoDB
    await mongo_db.connect()
    logger.info("Connected to MongoDB")

    # Note: Database migrations are handled by Alembic in entrypoint.sh
    logger.info("Database ready (migrations run via Alembic)")

    yield

    # Shutdown
    logger.info("Shutting down application...")
    await mongo_db.disconnect()
    await engine.dispose()
    logger.info("Disconnected from databases")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(notes.router)
app.include_router(websocket.router)
app.include_router(subscription.router, prefix="/api/subscription", tags=["subscription"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
