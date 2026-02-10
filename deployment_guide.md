# Deployment Guide

## 1. Development (Local)

### Backend
1. Ensure Docker is running.
2. Start Database: `docker compose up -d db`
3. Copy env: `cp .env.example .env` (Adjust values if needed)
4. Install Deps: `pip install -r requirements.txt`
5. Run: `uvicorn app.main:app --reload`

### Frontend
1. Copy env: `cp .env.example .env`
2. Install Deps: `npm install`
3. Run: `npm run dev`

## 2. Production (Server / Cloud)

### Backend
1. **Database**: Use a managed PostgreSQL (e.g., Neon). Get the connection string.
2. **Environment**: Set `APP_ENV=production`, `DEBUG=false`. Set `DATABASE_URL` to your Neon URL.
3. **Run**: Use a process manager like Gunicorn or Docker.
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
   ```

### Frontend
1. **Environment**: Set `VITE_API_BASE_URL` to your production backend domain (https://api.yourdomain.com/api/v1).
2. **Build**: `npm run build`
3. **Serve**: Deploy the `dist/` folder to Vercel, Netlify, or Nginx.
