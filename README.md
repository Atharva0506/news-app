# AI News Aggregator (NewsAI)

A next-generation news platform powered by multiple AI agents to aggregate, classify, summarize, and analyze news in real-time. Features a specialized dashboard with "Deep Analysis" streaming, AI Chat Assistant, and premium subscription tiers.

## 🚀 Features

-   **Smart News Feed**: Aggregates news from various sources with advanced filtering (Category, Sentiment, Search).
-   **Deep Analysis**: Uses a LangGraph-based multi-agent system (Collector -> Classifier -> Summarizer -> Bias Analyzer) to provide in-depth article insights. streaming results in real-time via Server-Sent Events (SSE).
-   **Daily Briefing**: auto-generated, cached daily summary of your feed.
-   **AI Chat Assistant**: Ask questions about news articles or your feed using RAG (Retrieval Augmented Generation).
-   **Premium Subscriptions**: Solana-based payment integration (Testnet) for upgrading to Pro plans.
-   **Authentication**: Secure JWT authentication with Access/Refresh token rotation and Google/GitHub OAuth support.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React (Vite)
-   **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
-   **State/API**: Context API, Custom Hooks, Fetch API (with Interceptors)

### Backend
-   **Framework**: FastAPI (Python)
-   **AI/LLM**: LangChain, LangGraph, Google Gemini Pro
-   **Database**: PostgreSQL (SQLAlchemy Async), Redis (Caching)
-   **Auth**: OAuth2 with Password Bearer (JWT)

## 📦 Installation

### Prerequisites
-   Node.js (v18+)
-   Python (v3.10+)
-   PostgreSQL
-   Redis (Optional, for production caching)

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Configure Environment Variables:
    Copy `.env.example` to `.env` and fill in your keys (Project assumes PostgreSQL is running on localhost:5432).
    ```bash
    cp .env.example .env
    ```

5.  Run Database Migrations (if using Alembic) or allow auto-init:
    The app initializes DB tables on startup for development.

6.  Start the Server:
    ```bash
    uvicorn app.main:app --reload
    ```
    API documentation available at `http://localhost:8000/docs`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the Development Server:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

## 🧪 Testing

Run backend tests:
```bash
cd backend
pytest app/tests
```

## 📝 License
MIT