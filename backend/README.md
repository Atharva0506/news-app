# Backend - AI News Aggregator

This is the backend service for the NewsAI application, built with **FastAPI**.

For full project documentation, architecture, and features, please refer to the [Root README](../README.md).

## 📂 Structure
- `app/api`: API route handlers
- `app/core`: Configuration, security, email, and database logic
- `app/models`: SQLAlchemy database models
- `app/schemas`: Pydantic models for request/response validation
- `app/services`: Business logic (AI Agents, News Fetching)

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
