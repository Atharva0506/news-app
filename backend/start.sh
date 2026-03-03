#!/bin/sh

# Run migrations
alembic upgrade head

# Start the application using gunicorn with uvicorn workers
# Render sets the PORT env var; default to 8000 for local dev
PORT=${PORT:-8000}
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT
