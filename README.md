# AI News Aggregator (NewsAI)

[![CI](https://github.com/Atharva0506/news-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Atharva0506/news-app/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![LangGraph](https://img.shields.io/badge/LangGraph-Agents-orange)
![Solana](https://img.shields.io/badge/Solana-Payments-9945FF?logo=solana)
![License](https://img.shields.io/badge/License-MIT-green)

A next-generation AI-powered news platform that aggregates, classifies, and summarizes news in real-time using a multi-agent LangGraph pipeline. Features a polished, production-grade dashboard with deep analysis streaming, an AI Chat Assistant, social sharing, personalized onboarding, and premium subscription tiers via Solana payments.

👉 **Live Demo:** [https://newsai.atharvanaik.me/](https://newsai.atharvanaik.me/)
👉 **Blog Post:** [https://atharvanaik.me/posts/news-ai](https://atharvanaik.me/posts/news-ai)

> [!NOTE]
> This app uses **Free Tier APIs** for the LLM (Google Gemini) and news data (RSS + GDELT). You may encounter rate limits or slow responses during peak usage. Thanks for understanding!

## 🏗️ Architecture

### Application Architecture

```mermaid
graph TB
    subgraph Client["Frontend — React + Vite"]
        UI[Shadcn UI + Tailwind + Framer Motion]
        Auth_FE[Auth Context]
        Wallet[Solana Wallet Adapter]
        SSE[SSE Stream Consumer]
        PWA[PWA — Offline Support]
    end

    subgraph API["Backend — FastAPI"]
        direction TB
        Routes[API Routes<br/>auth · news · ai · payments · chat · support · share · onboarding]
        Middleware[Middleware Stack<br/>CORS → Error Handler → GZip]
        RateLimit[Rate Limiter — SlowAPI]
    end

    subgraph AI["AI Pipeline — LangGraph"]
        direction LR
        Collector[Collector<br/>Quality Filter] --> Classifier[Classifier<br/>Category + Sentiment]
        Classifier --> Summarizer[Summarizer<br/>Short + Detail]
        Summarizer --> Bias[Bias Analyzer<br/>Premium Only]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL — Neon<br/>Users · Articles · Payments · Shares)]
        Redis[(Redis<br/>Cache — Optional)]
        Alembic[Alembic Migrations]
    end

    subgraph External["External Services"]
        Gemini[Google Gemini 2.5 Flash]
        Groq[Groq — Llama 3.1 8B Fallback]
        RSS[RSS Feeds<br/>News Data]
        Solana[Solana Devnet<br/>Payments]
        Resend[Resend<br/>Email]
    end

    UI --> Routes
    SSE -.->|Server-Sent Events| Routes
    Auth_FE --> Routes
    Wallet --> Routes
    Routes --> AI
    Routes --> PG
    Routes --> Redis
    AI --> Gemini
    AI -.->|Fallback| Groq
    Routes --> RSS
    Routes --> Solana
    Routes --> Resend
    Alembic --> PG
```

### Current Deployment

> Deployed on free-tier infrastructure to minimize costs while maintaining production-grade reliability.

```mermaid
graph LR
    subgraph User["End User"]
        Browser[Browser / PWA]
    end

    subgraph Vercel["Vercel — Frontend"]
        CDN[Edge CDN]
        SPA["React SPA<br/>Static Assets"]
    end

    subgraph Render["Render — Backend"]
        Docker["Docker Container<br/>Gunicorn + Uvicorn"]
        Health["/health Endpoint<br/>Keep-Alive Ping"]
    end

    subgraph Neon["Neon — Database"]
        PG_Cloud[("PostgreSQL<br/>Serverless")]
    end

    subgraph Services["External Services"]
        GeminiAPI[Google Gemini API]
        GroqAPI[Groq API]
        SolanaRPC[Solana RPC]
        ResendAPI[Resend Email]
    end

    Browser -->|HTTPS| CDN
    CDN --> SPA
    SPA -->|API Calls| Docker
    Docker --> PG_Cloud
    Docker --> GeminiAPI
    Docker -.->|Fallback| GroqAPI
    Docker --> SolanaRPC
    Docker --> ResendAPI

    style Vercel fill:#000,stroke:#fff,color:#fff
    style Render fill:#46E3B7,stroke:#333,color:#000
    style Neon fill:#0A0A0A,stroke:#00E599,color:#00E599
```

### Production-Scale Cloud Architecture (AWS)

> [!NOTE]
> The architecture below represents the **designed production-scale deployment** using AWS managed services. Due to cost constraints, the application currently runs on Render + Vercel free tiers (shown above). This design documents how the system would be deployed at scale with proper infrastructure.

```mermaid
graph TB
    subgraph Users["Users"]
        Client[Browser / PWA]
    end

    subgraph AWS["AWS Cloud"]
        subgraph Edge["Edge Layer"]
            R53[Route 53<br/>DNS]
            CF[CloudFront<br/>CDN + WAF]
        end

        subgraph Frontend_Infra["Frontend"]
            S3["S3 Bucket<br/>React Static Assets"]
        end

        subgraph Compute["Compute Layer"]
            ALB["Application Load Balancer<br/>HTTPS Termination"]
            subgraph ECS["ECS Fargate Cluster"]
                Task1["FastAPI Container<br/>Task 1"]
                Task2["FastAPI Container<br/>Task 2"]
            end
        end

        subgraph Data_Layer["Data Layer"]
            RDS[("RDS PostgreSQL<br/>Multi-AZ")]
            ElastiCache[("ElastiCache Redis<br/>Cluster Mode")]
        end

        subgraph Monitoring["Observability"]
            CW[CloudWatch<br/>Logs + Metrics]
            XRay[X-Ray<br/>Tracing]
        end

        subgraph CI["CI/CD"]
            ECR[ECR<br/>Container Registry]
            GHA[GitHub Actions<br/>Build + Test]
        end
    end

    subgraph ExtSvc["External Services"]
        Gemini_AWS[Google Gemini API]
        Groq_AWS[Groq API - Fallback]
        Solana_AWS[Solana RPC]
        Resend_AWS[Resend Email API]
    end

    Client -->|HTTPS| R53
    R53 --> CF
    CF -->|Static| S3
    CF -->|/api/*| ALB
    ALB --> Task1
    ALB --> Task2
    Task1 --> RDS
    Task1 --> ElastiCache
    Task2 --> RDS
    Task2 --> ElastiCache
    Task1 --> Gemini_AWS
    Task1 -.->|Fallback| Groq_AWS
    Task1 --> Solana_AWS
    Task1 --> Resend_AWS
    ECS --> CW
    GHA -->|Push Image| ECR
    ECR -->|Deploy| ECS

    style AWS fill:#232F3E,stroke:#FF9900,color:#fff
    style Edge fill:#1A73E8,stroke:#fff,color:#fff
    style Compute fill:#FF9900,stroke:#232F3E,color:#000
    style Data_Layer fill:#3B48CC,stroke:#fff,color:#fff
```

## 🚀 Key Features

### News & AI
- **Smart News Feed** — Aggregates news from RSS feeds and GDELT with category, sentiment, and keyword filtering.
- **Deep Analysis Agent** — Multi-agent LangGraph pipeline (Collector → Classifier → Summarizer → Bias Analyzer) with **SSE streaming** for instant feedback.
- **Daily Briefing** — Auto-generated, cached daily summary of your personalized feed with **real-time usage tracking**.
- **AI Chat Assistant** — Context-aware conversations with smooth scroll-locking and token-by-token streaming.
- **AI Reliability** — Automatic **Gemini-to-Groq fallback** mechanism to handle rate limits and service interruptions seamlessly.

### User Experience
- **Production-Grade UI** — Clean, minimal design inspired by Stripe, Linear, and Vercel. Dark/light mode, custom scrollbars, micro-animations.
- **Personalized Onboarding** — 3-step setup: language/region → favorite categories → summary style preference.
- **Social Sharing** — ChatGPT-style share modal with conversation preview and platform buttons (Copy Link, X, LinkedIn, Reddit, WhatsApp).
- **Saved Chats** — Save and revisit AI conversations (Pro plan).
- **Public Explore Page** — Browse latest news without an account.
- **PWA Support** — Installable, offline-ready progressive web app.

### Payments & Auth
- **Solana Payments** — On-chain subscription via Phantom/Solflare wallets (Devnet or Mainnet).
- **Tiered Plans** — Free (with 3-day Pro trial), Pro with higher limits and advanced features.
- **Secure Auth** — JWT with access/refresh token rotation, email verification, password reset.
- **Account Management** — Edit profile, change password, soft-delete with 7-day recovery.

### Developer
- **AI Support Bot** — Floating chat widget with streaming responses for instant assistance.
- **Real-time Usage Tracking** — Live-updating token and request meters with plan-based limits (no page refresh required).
- **Billing History** — Full payment transaction log with Solana explorer links.

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite 5 | Framework & build tool |
| Tailwind CSS 3.4 | Utility-first styling |
| Shadcn/ui | 50+ accessible components |
| Framer Motion | Animations & transitions |
| TanStack Query | Data fetching & caching |
| Solana Wallet Adapter | Blockchain wallet integration |
| vite-plugin-pwa | Progressive Web App |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python 3.11) | Async API framework |
| LangChain + LangGraph | Multi-agent AI pipeline |
| Gemini 2.5 + Groq | Primary + Fallback LLM setup |
| PostgreSQL (Neon) | Primary database |
| SQLAlchemy (Async) | ORM with Alembic migrations |
| Redis | Optional caching layer |
| SlowAPI | Rate limiting |
| Resend | Transactional email |

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+) & pnpm
- Python (v3.10+)
- PostgreSQL
- Redis (Optional, for production caching)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your API keys
uvicorn app.main:app --reload
```
API docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
pnpm install
cp .env.example .env      # Update if needed
pnpm dev
```
Access at `http://localhost:5173`

## 🐳 Docker Setup

Run the full stack with one command:

```bash
# Configure backend/.env first
docker compose up --build
```
- **Frontend**: `http://localhost:80`
- **Backend API**: `http://localhost:8000`
- **Database**: `localhost:5432`

## 🤝 Support & Issues

- **Report an Issue**: [GitHub Issues](https://github.com/Atharva0506/news-app/issues)
- **Contact Me**: [atharvan.coder@gmail.com](mailto:atharvan.coder@gmail.com)

## 📝 License

This project is licensed under the **MIT License**. Feel free to use and modify it for your own projects!