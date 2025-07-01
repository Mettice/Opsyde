from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from contextlib import contextmanager
import os
from typing import Generator
from urllib.parse import quote_plus
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Global variables for lazy initialization
_engine = None
_SessionLocal = None
_USE_REST_API = None
_initialized = False

def _initialize_database():
    """Initialize database connection with environment variables"""
    global _engine, _SessionLocal, _USE_REST_API, _initialized
    
    if _initialized:
        return
    
    # Load environment variables
    load_dotenv('.env')
    
    # Supabase connection settings
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")

    print(f"🔧 SUPABASE_URL: {SUPABASE_URL}")
    print(f"🔧 SUPABASE_DB_PASSWORD: {'***' if SUPABASE_DB_PASSWORD else 'NOT SET'}")

    # FORCE REST API MODE - Don't try PostgreSQL connections
    # This avoids network timeout issues and uses the working REST API
    DATABASE_URL = None
    _USE_REST_API = True

    if SUPABASE_URL and SUPABASE_ANON_KEY:
        print(f"✅ Using Supabase REST API mode (PostgreSQL direct connection disabled)")
        print(f"✅ REST API endpoint: {SUPABASE_URL}/rest/v1/")
        
        # Use SQLite for SQLAlchemy operations (tables are managed via REST API)
        DATABASE_URL = "sqlite:///./crewflow_supabase_cache.db"
        print(f"✅ Local SQLite cache for SQLAlchemy: {DATABASE_URL}")
        
    else:
        print("⚠️ No Supabase configuration found, using local SQLite")
        DATABASE_URL = "sqlite:///./crewflow_local.db"
        
    # Create engine and session
    if DATABASE_URL.startswith("sqlite"):
        _engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        _engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})
    
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    _initialized = True
    
    print(f"✅ Database initialization completed")
    print(f"✅ Mode: {'REST API' if _USE_REST_API else 'Direct PostgreSQL'}")

# Base class for models
class Base(DeclarativeBase):
    pass

@contextmanager
def get_db() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    Ensures that the session is properly closed after use.
    """
    _initialize_database()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """
    Initialize the database by creating all tables.
    Should be called when the application starts.
    """
    _initialize_database()
    
    # Import models to ensure they're registered with Base
    try:
        from models.supabase_models import UserProfile, UserAPIKeyDB, UserSettingsDB, IntegrationCredentialDB
        print("✅ Imported database models")
    except ImportError as e:
        logger.error(f"Failed to import database models: {e}")
    
    # Create tables for both PostgreSQL and SQLite
    if _USE_REST_API:
        print("ℹ️ Using SQLite fallback - creating local tables")
        Base.metadata.create_all(bind=_engine)
        print("✅ SQLite tables created successfully")
    else:
        print("ℹ️ Using PostgreSQL - tables managed via Supabase")
        # Still create tables in case they don't exist
        Base.metadata.create_all(bind=_engine)

def get_session() -> Session:
    """
    Get a new database session.
    Remember to close the session after use.
    """
    _initialize_database()
    return _SessionLocal()

def should_use_rest_api() -> bool:
    """
    Check if we should use REST API instead of direct database connection
    """
    _initialize_database()
    return _USE_REST_API

@property
def engine():
    """Get the database engine (lazy initialization)"""
    _initialize_database()
    return _engine 