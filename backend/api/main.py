from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import os
from typing import Dict, Any, AsyncGenerator
from fastapi.openapi.utils import get_openapi

# Import routers and core components
from backend.api.routers.workflow_router import router as workflow_router
from backend.api.routers.node_router import router as node_router
from backend.api.routers.tool_router import router as tool_router
from backend.api.routers.auth_router import router as auth_router
from backend.api.routers.trigger_router import router as trigger_router
from backend.api.routers.output_router import router as output_router
from backend.database import init_db
from backend.utils.logging import setup_logging
from backend.utils.security import security_manager
from backend.config.settings import get_settings
from backend.core.runner import UnifiedRunner
from backend.models.api_models import APIResponse, ErrorCode
from backend.core.exceptions import CrewFlowError
from backend.utils.api_utils import handle_exception

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Starting up application...")
    try:
        # Initialize any resources here
        # Initialize database
        init_db()
        logger.info("Database initialized successfully")
        
        # Initialize security
        security_manager.init_app(app)
        logger.info("Security manager initialized")
        
        # Store unified runner in app state
        app.state.runner = UnifiedRunner()
        logger.info("Unified runner initialized")
        
        # Load environment variables
        logger.info("Environment variables loaded")
        logger.info(f"Running in {settings.ENVIRONMENT} mode")
        
        yield
    finally:
        # Shutdown
        logger.info("Shutting down application...")
        # Clean up any resources here

# Create FastAPI app
app = FastAPI(
    title="CrewFlow API",
    description="API for managing AI workflows and automation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Load settings
settings = get_settings()

# Initialize core components
unified_runner = UnifiedRunner()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Dependency to get unified runner
async def get_unified_runner():
    return app.state.runner

# Update router dependencies to use unified runner
workflow_router.dependencies.append(Depends(get_unified_runner))
node_router.dependencies.append(Depends(get_unified_runner))
tool_router.dependencies.append(Depends(get_unified_runner))
output_router.dependencies.append(Depends(get_unified_runner))

# Register routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(workflow_router, prefix="/api/workflows")
app.include_router(node_router, prefix="/api/nodes")
app.include_router(tool_router, prefix="/api/tools")
app.include_router(trigger_router, prefix="/api/triggers")
app.include_router(output_router, prefix="/api/outputs")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=APIResponse.error_response(
            code=ErrorCode.INTERNAL_ERROR,
            message=exc.detail
        ).dict()
    )

@app.exception_handler(CrewFlowError)
async def crewflow_exception_handler(request: Request, exc: CrewFlowError):
    response = handle_exception(exc)
    return JSONResponse(
        status_code=400,
        content=response.dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    response = handle_exception(exc)
    return JSONResponse(
        status_code=500,
        content=response.dict()
    )

# Version endpoint
@app.get("/version")
async def get_version():
    return {
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "api_version": "v1"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "Nodai Flow API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Nodai Flow API",
        version="1.0.0",
        description="Complete API documentation for Nodai Flow",
        routes=app.routes,
    )

    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
