import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Generator, Dict, Any
from fastapi import FastAPI

# Update imports to use absolute paths
from backend.database import Base, get_db
from backend.api.main import app
from backend.config.settings import get_settings
from backend.models.data import NodeData

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    """Create a test database engine"""
    return create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

@pytest.fixture(scope="session")
def TestingSessionLocal(engine):
    """Create a test database session factory"""
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session(engine, TestingSessionLocal):
    """Get a test database session"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session: Generator) -> Generator:
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client 

@pytest.fixture
def base_node_context():
    """Provides a base context for node testing"""
    return {
        "execution_id": "test-execution-1",
        "workflow_id": "test-workflow-1",
        "user_id": "test-user-1",
        "env": {
            "OPENAI_API_KEY": "test-key",
            "DISCORD_WEBHOOK_URL": "test-url",
            "GOOGLE_SHEETS_CREDENTIALS": "{}"
        }
    }

@pytest.fixture
def base_node_input() -> Dict[str, NodeData]:
    """Base input for node testing"""
    return {
        "input": NodeData(value="test input")
    }

@pytest.fixture
def mock_settings(monkeypatch):
    """Mock settings for testing"""
    class MockSettings:
        OPENAI_API_KEY = "test-key"
        DEFAULT_MODEL = "gpt-3.5-turbo"
        MAX_TOKENS = 2000
        TEMPERATURE = 0.7

    monkeypatch.setattr("backend.config.settings.get_settings", lambda: MockSettings())

@pytest.fixture
def mock_db_session():
    """Mock database session for testing"""
    class MockSession:
        def __init__(self):
            self.committed = False
            self.closed = False
        
        def commit(self):
            self.committed = True
        
        def close(self):
            self.closed = True
            
        def add(self, obj):
            pass
            
        def query(self, *args, **kwargs):
            return self
            
        def filter(self, *args, **kwargs):
            return self
            
        def first(self):
            return None
            
        def all(self):
            return []
    
    return MockSession()

@pytest.fixture
def test_client():
    """Returns a test client for API testing"""
    return TestClient(app) 