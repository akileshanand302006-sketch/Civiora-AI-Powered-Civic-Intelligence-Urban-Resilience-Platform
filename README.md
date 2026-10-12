<div align="center">

# 🏙️ CIVICPULSE
### AI-Powered Civic Intelligence & Urban Resilience Platform
*"Understand the city. Respond intelligently."*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-black.svg?logo=three.js)](https://threejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg?logo=node.js)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.112-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 🌟 Executive Overview

**CivicPulse** is an enterprise-grade Smart City & GovTech platform engineered to replace fragmented, slow, manual municipal issue reporting with an autonomous, real-time civic intelligence ecosystem.

Unlike traditional CRUD ticketing portals, CivicPulse delivers:
1. **Interactive 3D Digital Twin**: WebGL/R3F procedural 3D model of municipal infrastructure with live spatial telemetry and incident beacon nodes.
2. **Autonomous Multi-Modal AI**: Computer vision hazard segmentation (YOLOv8) alongside transformer-based NLP intent classification and duplicate clustering.
3. **Dynamic SLA & Auto-Escalation Engine**: Multi-factor risk calculation incorporating sensitive urban zones (hospitals, schools) and weather conditions.
4. **Multi-Platform Ecosystem**: Web command portal for administrators and citizens, alongside offline-ready field response architecture.
5. **Zero-Trust Security**: Argon2id password hashing, token-family refresh rotation, and 30+ granular RBAC/ABAC permissions.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────┐
                               │   React 18 + Vite Web  │
                               │   3D Digital Twin (R3F)│
                               └───────────┬────────────┘
                                           │
                         WebSocket / REST  │  JWT Auth
                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CIVICPULSE BACKEND API                          │
│                                                                        │
│   • Node.js 20 + Express (ESM + TypeScript)                            │
│   • Socket.IO Multi-Tenant Real-Time Room Subscriptions                │
│   • MongoDB 7 (2dsphere Geospatial Indexing & TTL Sessions)            │
│   • Redis 7 (Sub-millisecond Session Invalidation & BullMQ Queues)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ HTTP Service-to-Service
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FASTAPI AI MICROSERVICE                           │
│                                                                        │
│   • Computer Vision: Surface Degradation & Damage Segmentation         │
│   • NLP Pipeline: Entity Extraction, Sentiment & Urgency Triaging      │
│   • Duplicate Engine: Haversine Geodesic Radius + S-BERT Similarity    │
│   • Risk Scoring: Multi-Factor Threat Evaluation & SLA Forecasting     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **Docker & Docker Compose** (Optional, for running MongoDB & Redis containers)
- **Python**: `>= 3.10` (For AI service)

### 1. Installation
Clone the repository and install all monorepo dependencies:
```bash
git clone https://github.com/your-org/civicpulse.git
cd civicpulse
npm install
```

### 2. Environment Configuration
Copy the template environment variables:
```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

### 3. Start Local Databases (Docker)
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Seed Database with Demo Municipality
```bash
npm run seed --workspace=apps/backend
```

### 5. Launch Development Services
Run all services concurrently:
```bash
# Web Frontend (http://localhost:5173)
npm run dev:web

# Backend REST & WebSocket API (http://localhost:4000)
npm run dev:backend

# AI Intelligence Service (http://localhost:8000)
npm run dev:ai
```

---

## 🔑 Demo Accounts (Pre-Seeded)

All demo accounts use the standard password: `CivicPulse@2026`

| Persona | Email | Access Capabilities |
|---|---|---|
| **Citizen** | `citizen@civicpulse.demo` | Issue reporting, tracking, community verification |
| **Field Worker** | `worker@civicpulse.demo` | Field work order queue, status progression, proof photos |
| **Officer** | `officer@civicpulse.demo` | Department triage, staff assignment, resolution verification |
| **Manager** | `manager@civicpulse.demo` | Cross-department operations, SLA monitoring, escalations |
| **Emergency Operator** | `emergency@civicpulse.demo` | Red SOS radar, emergency fleet dispatch |
| **System Admin** | `admin@civicpulse.demo` | 3D Twin Command Center, multi-tenant governance, audit logs |

---

## 📂 Monorepo Structure

```
civicpulse/
├── apps/
│   ├── web/               # React 18 + Vite + Three.js + Zustand + SCSS
│   ├── backend/           # Node.js + Express + Mongoose + Socket.IO + Redis
│   ├── ai-service/        # Python 3.11 + FastAPI + Computer Vision + NLP
│   └── mobile/            # Flutter 3.x cross-platform mobile client
├── packages/
│   └── shared/            # Shared TypeScript types, constants, Zod schemas
├── docker/                # Multi-stage production Dockerfiles & Docker Compose
├── docs/                  # Architecture, API, Security, and Deployment guides
├── turbo.json             # Turborepo build pipeline orchestration
└── package.json           # Workspace root scripts
```

---

## 🧪 Build & Verification Commands

```bash
# Typecheck all packages in parallel via Turborepo
npm run typecheck

# Build production bundles across all packages
npm run build

# Start production backend server
npm run --prefix apps/backend start

# Preview production web build
npm run --prefix apps/web preview
```

---

## 📜 Documentation Index
- [System Architecture Blueprint](docs/ARCHITECTURE.md)
- [REST API & WebSocket Reference](docs/API.md)
- [Security & Hardening Standards](docs/SECURITY.md)
- [Deployment & Production Guide](docs/DEPLOYMENT.md)

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
