# Python Backend — Market Basket Analyzer

FastAPI server that replaces the TypeScript business logic. The Next.js frontend is
**completely unchanged** — its API routes now act as thin authenticated proxies to this server.

## Architecture

```
Browser  →  Next.js (port 3000)
              ├── /api/auth/*        (next-auth — session management, unchanged)
              ├── /api/sales         (thin proxy → Python /api/sales)
              ├── /api/analysis      (thin proxy → Python /api/analysis)
              └── /api/suggest       (thin proxy → Python /api/suggest)
                                          ↓
                              FastAPI (port 8000)
                              ├── POST /api/auth/register
                              ├── POST /api/auth/login
                              ├── GET  /api/sales
                              ├── POST /api/sales
                              ├── GET  /api/analysis   ← full Apriori pipeline
                              └── POST /api/suggest    ← cart recommendations
```

The Next.js routes validate the next-auth JWT session, then forward requests to Python with
the verified user's `_id` in the `X-User-ID` header. Python trusts this header and uses
it to scope all DB queries.

## Setup

```bash
# Install Python deps (once)
pip install -r backend/requirements.txt

# Terminal 1 — Python backend
npm run py:dev       # or: python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Next.js frontend
npm run dev
```

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET  | `/api/sales` | X-User-ID header |
| POST | `/api/sales` | X-User-ID header |
| GET  | `/api/analysis` | X-User-ID header |
| POST | `/api/suggest` | X-User-ID header |

Interactive docs: **http://localhost:8000/docs**

## Environment Variables

The server reads `.env.local` from the project root automatically.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | — | MongoDB Atlas connection string |
| `MONGODB_DB` | `market` | Database name |
