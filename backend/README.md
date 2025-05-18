# CrewFlow Backend

## Overview
CrewFlow is an AI workflow automation platform that enables the creation and execution of complex AI-powered workflows.

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL
- Redis (for caching)

### Installation
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Run migrations
alembic upgrade head
```

### Running Tests
```bash
pytest tests/ -v --cov=app
```

## Project Structure

```
backend/
├── frameworks/         # AI framework integrations
│   ├── autogen_runner.py
│   ├── crewai_runner.py
│   ├── huggingface_runner.py
│   └── openrouter_runner.py
├── crew_runner.py      # Workflow execution engine
├── discord_runner.py   # Discord integration
├── email_runner.py     # Email integration
├── sheets_runner.py    # Google Sheets integration
├── main.py             # FastAPI application
└── requirements.txt    # Python dependencies
```

## Environment Variables

The backend requires several environment variables for API keys and configuration:
- `OPENROUTER_API_KEY`: API key for OpenRouter
- `EMAIL_SENDER`: Email address for sending emails
- `EMAIL_PASSWORD`: Password for the email account

Create a `.env` file in the backend directory with these variables.

## Error Handling

The backend includes comprehensive error handling and logging to help diagnose issues during workflow execution.

## API Documentation
API documentation is available at:
- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Development

### Adding New Node Types
1. Create a new node class in `nodes/`
2. Implement required interfaces
3. Add configuration model
4. Add tests
5. Update documentation

### Running Locally
```bash
uvicorn main:app --reload
```

6. Create a test configuration file:

```python:crewbuilder/backend/pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --verbose --cov=app --cov-report=term-missing
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
```

To implement this testing and documentation strategy:

1. Create the directory structure:
```bash
mkdir -p tests/{test_nodes,test_services,test_api}
touch tests/conftest.py
```

2. Add test dependencies to requirements.txt
```
pytest==7.3.1
pytest-asyncio==0.21.0
pytest-cov==4.1.0
httpx==0.24.1
```

3. Set up GitHub Actions for CI/CD:

```yaml:crewbuilder/.github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        pytest tests/ -v --cov=app
```

Would you like me to implement any specific part of this testing and documentation strategy? We can start with:

1. Setting up the basic test infrastructure
2. Writing tests for a specific component
3. Implementing API documentation
4. Creating the project documentation

Let me know which aspect you'd like to tackle first!