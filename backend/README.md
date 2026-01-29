# AI News Backend

A production-ready FastAPI backend for an AI-powered News Application.

## Features
- **Authentication**: JWT (Email/Password)
- **AI Agents**: Multi-agent system (Collector, Classifier, Summarizer) using LangGraph
- **Payments**: Solana subscription system (Test & Real modes)
- **News Ingestion**: Dual-mode ingestion (Live API or Local Mock)

## Quick Start

### 1. Requirements
- Docker & Docker Compose
- Python 3.11+

### 2. Setup
```bash
# Start Databases
docker compose up -d db

# Install Dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install "bcrypt<4.0.0"

# Run Migrations
alembic upgrade head
```

### 3. Running the App
```bash
uvicorn app.main:app --reload
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) for API documentation.

## Testing

### Automated Tests
Run the full test suite (Auth, News, Payments):
```bash
./run_tests.sh
```

### Manual Verification
See [walkthrough.md](file:///home/atharva/.gemini/antigravity/brain/5891df3b-9a03-47f6-aff3-2655c5408c27/walkthrough.md) for detailed curl commands to manually verify the API endpoints.

## Configuration
- `NEWS_MODE`: Set to `TEST` (default) to use local mock data. Set to `LIVE` for real API.
- `SOLANA_MODE`: Set to `TEST` (default) for simulated payments. Set to `REAL` for Devnet.
