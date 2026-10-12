# CivicPulse — Deployment & DevOps Guide

> **Deployable Architecture**: Monorepo with containerized microservices and automated CI/CD.

---

## 1. Quickstart: Local Development via Docker Compose

To spin up the complete local environment (MongoDB, Redis, and dev tools):

```bash
# 1. Start MongoDB and Redis containers
docker compose -f docker/docker-compose.yml up -d

# 2. Run initial database seeding (generates demo tenant & users)
npm run seed --workspace=apps/backend

# 3. Start development servers concurrently
npm run dev:backend   # API on http://localhost:4000
npm run dev:web       # Web app on http://localhost:5173
npm run dev:ai        # AI service on http://localhost:8000
```

---

## 2. Production Docker Containers

### Backend Container
```bash
docker build -f docker/backend.Dockerfile -t civicpulse-backend:latest .
docker run -p 4000:4000 --env-file apps/backend/.env civicpulse-backend:latest
```

### AI Service Container
```bash
docker build -f docker/ai-service.Dockerfile -t civicpulse-ai:latest .
docker run -p 8000:8000 --env-file apps/ai-service/.env civicpulse-ai:latest
```

### Web Production Bundle
```bash
npm run build --workspace=apps/web
# Serves static assets from apps/web/dist with Nginx or edge CDN (Vercel, Cloudflare, Netlify)
```

---

## 3. Environment Variable Checklist

### Backend (`apps/backend/.env`)
| Variable | Description | Example |
|---|---|---|
| `PORT` | API Port | `4000` |
| `NODE_ENV` | Environment | `production` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb://localhost:27017/civicpulse` |
| `REDIS_URL` | Redis URI | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | 64+ char random secret | `prod_jwt_secret_key_...` |
| `JWT_REFRESH_SECRET`| 64+ char random secret | `prod_refresh_secret_...` |
| `WS_CORS_ORIGIN` | Allowed Client Origins | `http://localhost:5173,https://civicpulse.city` |

### Web Frontend (`apps/web/.env`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend REST Base URL | `/api/v1` or `http://localhost:4000/api/v1` |
| `VITE_WS_URL` | WebSocket Server URL | `http://localhost:4000` |
| `VITE_DEFAULT_ORG_SLUG` | Default Tenant Slug | `metropolis` |

### AI Service (`apps/ai-service/.env`)
| Variable | Description | Example |
|---|---|---|
| `AI_SERVICE_PORT` | FastAPI Port | `8000` |
| `AI_SERVICE_SECRET` | Inter-service auth token | `civicpulse-ai-internal-key-2026` |
