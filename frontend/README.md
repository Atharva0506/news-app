# Frontend - AI News Aggregator

This is the frontend client for the NewsAI application, built with **React, Vite, and Tailwind CSS**.

For full project documentation, architecture, and features, please refer to the [Root README](../README.md).

## 📂 Structure
- `src/components`: Reusable UI components (Shadcn UI, Landing page sections)
- `src/pages`: Main application pages (Dashboard, Landing, Auth)
- `src/context`: React Context providers (Auth, Wallet)
- `src/lib`: Utilities and API clients

## 🛠️ Local Development

### Prerequisites
- Node.js 18+

### Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    # or
    pnpm install
    ```

2.  **Environment Setup**:
    ```bash
    cp .env.example .env
    # Update .env if needed
    ```

3.  **Run Dev Server**:
    ```bash
    npm run dev
    # or
    pnpm dev
    ```
    Access at `http://localhost:8080` (or configured port)

## 📦 Build
```bash
pnpm build
pnpm preview
```
