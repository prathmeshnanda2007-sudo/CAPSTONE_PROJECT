# 🏘 Village Data API Platform

> **India's most comprehensive village-level geographical data API** — 564,159 villages across 35+ states, built for B2B SaaS.

[![CI/CD](https://github.com/prathmeshnanda2007-sudo/CAPSTONE_PROJECT/actions/workflows/ci.yml/badge.svg)](https://github.com/prathmeshnanda2007-sudo/CAPSTONE_PROJECT/actions)
[![API](https://img.shields.io/badge/API-Railway-blueviolet)](https://railway.app)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://vercel.app)
[![DB](https://img.shields.io/badge/Database-NeonDB-teal)](https://neon.tech)
[![Cache](https://img.shields.io/badge/Cache-Upstash_Redis-red)](https://upstash.com)

---

## 🗺 Live URLs

| Service | URL |
|---|---|
| **Frontend Dashboard** | https://your-app.vercel.app |
| **Live Demo** | https://your-app.vercel.app/demo |
| **API Base URL** | https://api.villageplatform.in/v1 |
| **Swagger UI** | https://api.villageplatform.in/api-docs |

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)             Vercel Edge Network         │
│  ┌──────────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌───────────────┐   │
│  │ Login /  │ │ Dash │ │ Admin │ │ Demo │ │  API Docs     │   │
│  │ Register │ │board │ │ Panel │ │Page  │ │  (Swagger)    │   │
│  └──────────┘ └──────┘ └───────┘ └──────┘ └───────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (JWT / API Key)
┌───────────────────────────▼─────────────────────────────────────┐
│  API (Express + TypeScript)          Railway                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Auth     │ │ Geo API  │ │ Rate Limiter │ │ Admin Panel  │  │
│  │ /auth/*  │ │ /geo/*   │ │ (Redis)      │ │ /admin/*     │  │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ └──────────────┘  │
└───────┼────────────┼──────────────┼──────────────────────────── ┘
        │            │              │
        ▼            ▼              ▼
   NeonDB (PostgreSQL)       Upstash Redis
   564,159 villages          Rate Limiting
   GIN trigram index         Response Cache
```

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, TypeScript, TailwindCSS v4, Zustand, React Query |
| **Backend API** | Node.js, Express 5, TypeScript |
| **Database** | NeonDB (PostgreSQL), Prisma ORM |
| **Cache / Rate Limit** | Upstash Redis (HTTP client) |
| **Auth** | JWT (dashboard) + API Key + Secret (B2B) |
| **Docs** | Swagger UI (OpenAPI 3.0.3) |
| **Deployment** | Vercel (frontend) + Railway (API) |
| **CI/CD** | GitHub Actions |

---

## 🗂 Project Structure

```
CAPSTONE_PROJECT/
├── api/                        ← Express API server
│   ├── prisma/
│   │   ├── schema.prisma       ← PostgreSQL schema with GIN indexes
│   │   └── migrations/
│   └── src/
│       ├── config/             ← database.ts, redis.ts
│       ├── controllers/        ← villageController, authController, adminController
│       ├── docs/               ← swagger.ts (OpenAPI 3.0.3 spec)
│       ├── middlewares/        ← authMiddleware, adminMiddleware, rateLimiter, apiKeyMiddleware
│       ├── routes/             ← index.ts, villageRoutes.ts, adminRoutes.ts
│       ├── services/           ← villageService.ts (Prisma queries)
│       └── utils/              ← cache.ts, logger.ts, responseFormatter.ts
│
├── frontend/                   ← React SPA
│   └── src/
│       ├── components/         ← Sidebar, ProtectedRoute
│       ├── layouts/            ← DashboardLayout
│       ├── pages/
│       │   ├── admin/          ← AdminDashboard, AdminUsers, AdminLogs
│       │   ├── Login.tsx       ← Auth UI
│       │   ├── Register.tsx
│       │   ├── Overview.tsx    ← Dashboard
│       │   ├── DataExplorer.tsx
│       │   ├── ApiKeys.tsx
│       │   ├── Docs.tsx        ← Interactive API reference
│       │   └── Demo.tsx        ← Public village search widget
│       ├── services/           ← api.ts, adminApi.ts
│       └── store/              ← authStore.ts (Zustand)
│
├── scripts/                    ← Data import pipeline (Python)
│   └── import_all_states.py
│
└── .github/
    └── workflows/
        └── ci.yml              ← CI/CD pipeline
```

---

## ⚡ API Endpoints

### Geo Hierarchy
```
GET  /v1/geo/states
GET  /v1/geo/states/:id/districts
GET  /v1/geo/districts/:id/sub-districts
GET  /v1/geo/sub-districts/:id/villages?page=1&limit=100
GET  /v1/geo/villages/:id
GET  /v1/geo/villages/search?q=Khed&limit=20
GET  /v1/geo/villages/autocomplete?q=Mum&limit=10
```

### Auth
```
POST /v1/auth/register
POST /v1/auth/login
```

### Dashboard & Keys (JWT)
```
GET  /v1/dashboard/metrics
GET  /v1/keys
POST /v1/keys
PATCH /v1/keys/:id/revoke
```

### Admin (ADMIN role)
```
GET   /v1/admin/stats
GET   /v1/admin/users
PATCH /v1/admin/users/:id/approve
PATCH /v1/admin/users/:id/plan
GET   /v1/admin/logs
DELETE /v1/admin/cache
```

---

## 🔒 Authentication

### Dashboard (JWT)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### B2B API Keys
```http
X-API-Key:    ak_a1b2c3d4e5f6...
X-API-Secret: as_z9y8x7w6v5u4...
```

---

## 💼 Rate Limits

| Plan | Daily | Burst (per min) |
|---|---|---|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

Rate limit info is returned via `X-RateLimit-*` headers on every geo response.  
Cache status is returned via `X-Cache: HIT/MISS`.

---

## 🛠 Local Development

### Prerequisites
- Node.js 20+
- Python 3.10+ (for data import only)
- NeonDB database
- Upstash Redis database

### 1. Clone & install
```bash
git clone https://github.com/prathmeshnanda2007-sudo/CAPSTONE_PROJECT.git
cd CAPSTONE_PROJECT

# Install API deps
cd api && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cd api
cp .env.example .env
# Edit .env with your NeonDB + Upstash + JWT_SECRET values
```

### 3. Run migrations
```bash
cd api
npx prisma migrate deploy
npx prisma generate
```

### 4. Start both servers
```bash
# Terminal 1 — API (port 3000)
cd api && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Demo: http://localhost:5173/demo
- API: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

### 5. Promote yourself to Admin
```sql
-- Run via: cd api && node_modules\.bin\prisma db execute --file your.sql
UPDATE "User" SET role = 'ADMIN', status = 'ACTIVE' WHERE email = 'your@email.com';
```

---

## 🚀 Deployment

### Frontend → Vercel

1. Import project at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-railway-api.railway.app/v1`
4. Deploy — Vercel uses `frontend/vercel.json` automatically

### API → Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables (from `api/.env.example`):
   - `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `FRONTEND_URL` = your Vercel URL
4. Railway uses `railway.json` automatically

### GitHub Actions Secrets

Set these in your repo → Settings → Secrets:

| Secret | Description |
|---|---|
| `DATABASE_URL` | NeonDB pooled connection string |
| `DIRECT_URL` | NeonDB direct connection string |
| `VITE_API_URL` | Railway API URL + `/v1` |
| `VERCEL_TOKEN` | From vercel.com → Account Settings → Tokens |
| `RAILWAY_TOKEN` | From railway.app → Account → Tokens |

---

## 📊 Data

- **Source:** Census of India 2011 MDDS (Master Data Directory System)
- **Scale:** 564,159 villages across 35+ states
- **Hierarchy:** State → District → Sub-District → Village
- **Search:** PostgreSQL GIN trigram index (`pg_trgm` extension)
- **Import:** `scripts/import_all_states.py` (handles XLS, ODS formats)

---

## 📋 Development Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ | Backend Hardening (Prisma, API Key auth, logging, security headers) |
| 2 | ✅ | NeonDB Migration + 564,159 villages imported |
| 3 | ✅ | Auth UI (Login, Register, Zustand store, Protected Routes) |
| 4 | ✅ | Upstash Redis Rate Limiting + Response Caching |
| 5 | ✅ | Admin Panel (user management, log viewer, analytics) |
| 6 | ✅ | API Documentation (Swagger UI + interactive Docs page + Demo widget) |
| 7 | ✅ | DevOps (Vercel + Railway + GitHub Actions CI/CD) |

---

## 📄 License

Proprietary — © 2026 Village API Platform. All rights reserved.