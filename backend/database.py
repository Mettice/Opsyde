from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from contextlib import contextmanager
import os
from typing import Generator
from urllib.parse import quote_plus

# Supabase connection settings
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if SUPABASE_URL:
    # Extract project reference from Supabase URL
    project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
    DATABASE_URL = f"postgresql://postgres:{SUPABASE_ANON_KEY}@db.{project_ref}.supabase.co:5432/postgres"
else:
    # Fallback to SQLite for local development
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crewflow.db")

# Set up engine configuration based on database type
if DATABASE_URL.startswith("sqlite"):
    engine_config = {
        "connect_args": {"check_same_thread": False}
    }
else:
    engine_config = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800
    }

# Create SQLAlchemy engine with appropriate settings
engine = create_engine(DATABASE_URL, **engine_config)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
class Base(DeclarativeBase):
    pass

@contextmanager
def get_db() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    Ensures that the session is properly closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """
    Initialize the database by creating all tables.
    Should be called when the application starts.
    """
    Base.metadata.create_all(bind=engine)

def get_session() -> Session:
    """
    Get a new database session.
    Remember to close the session after use.
    """
    return SessionLocal() 