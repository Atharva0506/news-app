# Backend — AI News Aggregator

The backend service for NewsAI, built with **FastAPI, LangGraph, Google Gemini 2.5 Flash, and Groq (Llama 3.1)**.

For full project documentation, architecture, and features, see the [Root README](../README.md).

## 📂 Structure
- `app/api` — API route handlers (auth, news, ai, payments, chat, support, share, onboarding)
- `app/core` — Configuration, security, email, caching, and plan management
- `app/models` — SQLAlchemy database models
- `app/schemas` — Pydantic request/response schemas
- `app/services` — Business logic (AI agents, news fetching, feed aggregation)

## 🛠️ Local Development

### Prerequisites
- Python 3.10+
- PostgreSQL
- Redis (Optional)

### Quick Start

1.  **Install Dependencies**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

2.  **Environment Setup**:
    ```bash
    cp .env.example .env
    # Update .env with your keys
    ```

3.  **Run Server**:
    ```bash
    uvicorn app.main:app --reload
    ```
    API Docs: `http://localhost:8000/docs`

    > **Docker Note:** When running via Docker, database migrations are applied automatically on startup.

## 🧪 Testing
```bash
pytest
```
