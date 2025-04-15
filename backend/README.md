# CrewBuilder Backend

The backend API for CrewBuilder, built with FastAPI and Python.

## Overview

This backend provides the API endpoints for executing AI agent workflows and exporting results. It integrates with various AI frameworks and external services.

## Features

- **Workflow Execution**: Run agent-based workflows with dependency resolution
- **Framework Integrations**: Support for CrewAI, OpenRouter, HuggingFace, and more
- **Export Options**: Send results to email, Discord, or Google Sheets
- **Streaming Responses**: Real-time streaming of execution logs

## API Endpoints

- **POST /run-crew**: Execute a workflow
- **POST /send-email**: Send workflow results via email
- **POST /export-sheets**: Export workflow results to Google Sheets
- **POST /post-discord**: Post workflow results to Discord
- **GET /health**: Health check endpoint

## Development

### Prerequisites

- Python 3.8+
- pip

### Installation

```
pip install -r requirements.txt
```

### Running the Development Server

```
uvicorn main:app --reload
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