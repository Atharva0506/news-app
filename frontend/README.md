# Frontend — AI News Aggregator

The frontend client for NewsAI, built with **React 18, Vite 5, Tailwind CSS 3.4, Shadcn/ui, and Framer Motion**.

For full project documentation, architecture, and features, see the [Root README](../README.md).

## 📂 Structure
- `src/components` — Reusable UI components (Shadcn/ui, Landing, Dashboard)
- `src/pages` — Application pages (Dashboard, Landing, Auth, Legal, Explore)
- `src/context` — React Context providers (Auth, Wallet)
- `src/hooks` — Custom hooks (API, SSE, theme)
- `src/lib` — Utilities and API clients

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- pnpm

### Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```
Access at `http://localhost:5173`

## 📦 Build
```bash
pnpm build
pnpm preview
```
