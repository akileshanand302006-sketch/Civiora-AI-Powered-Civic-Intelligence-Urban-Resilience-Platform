# CivicPulse — Architecture & Technical Blueprint

> **AI-Powered Civic Intelligence & Urban Resilience Platform**  
> *"Understand the city. Respond intelligently."*

---

## 1. Executive Summary

CivicPulse is an enterprise-grade GovTech and Smart City platform engineered to bridge common citizens, rapid-response field workers, departmental officers, and emergency command centers. Rather than treating civic reporting as static CRUD tickets, CivicPulse operates as a real-time civic nervous system combining:
- **3D Digital Twin Visualization** (React Three Fiber + Three.js)
- **Autonomous Multi-Modal AI** (Computer Vision hazard classification + Transformer NLP)
- **Geospatial Clustering & Duplicate Elimination** (DBSCAN + Haversine distance)
- **Multi-Factor Risk & Dynamic SLA Auto-Escalation Engine**
- **Strict Multi-Tenant & Granular RBAC/ABAC Security Governance**

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│                                                                        │
│   React 18 + Vite Web App            Flutter 3.x Mobile Client         │
│   • 3D City Digital Twin             • Native Camera Capture           │
│   • GovTech Glassmorphism Design     • Offline-First SQLite Sync       │
│   • WebSocket Live Telemetry         • One-Tap Emergency SOS           │
└───────────────────▲──────────────────────────────▲─────────────────────┘
                    │                              │
                    │ REST / WebSockets            │ REST / WebSockets
                    ▼                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / PROXY                             │
│                  Reverse Proxy, Rate Limiting, SSL                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CORE BACKEND ENGINE (NODE.JS)                      │
│                                                                        │
│   Express + TypeScript REST v1 API       Socket.IO Real-Time Gateway  │
│   • Argon2id + JWT Session Rotation      • Multi-Tenant Org Rooms     │
│   • 30+ Permission RBAC/ABAC Matrix      • Emergency Dispatch Rooms   │
│   • Incident State Machine Engine        • Live Map Geo Stream        │
│   • BullMQ Async Queue Dispatcher        • User Notification Stream   │
└───────────────────┬──────────────────────────────▲─────────────────────┘
                    │                              │
                    │ HTTP Service-to-Service      │ Async Event Stream
                    ▼                              │
┌──────────────────────────────────────────────────┴─────────────────────┐
│                    PYTHON AI SERVICE (FASTAPI)                         │
│                                                                        │
│   • Computer Vision: YOLOv8 Surface Degradation & Damage Segmentation  │
│   • Transformer NLP: Multilingual Entity Extraction & Intent Triage    │
│   • Duplicate Engine: Geodesic Haversine Proximity + S-BERT Semantics  │
│   • Risk Scoring: Weather Aggravation + Sensitive Zone Proximities     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Breakdown

| Layer | Technology | Rationale |
|---|---|---|
| **Web Frontend** | React 18, Vite 5, TypeScript | Blazing HMR build performance, strong type safety |
| **3D Rendering** | Three.js, React Three Fiber, Drei | WebGL accelerated real-time 3D City Digital Twin |
| **Styling** | Custom SCSS, Glassmorphism Tokens | Curated GovTech aesthetic with dark/light themes |
| **State Management** | Zustand, TanStack Query | Minimal boilerplate, optimistic mutations, server cache |
| **Backend API** | Node.js 20, Express, TypeScript | High-throughput asynchronous I/O, enterprise ecosystem |
| **Databases** | MongoDB 7 (Mongoose), Redis 7 (ioredis) | GeoJSON 2dsphere spatial indexing, sub-millisecond cache |
| **Real-Time** | Socket.IO 4.x | Auto-reconnection, bi-directional room subscriptions |
| **AI Service** | Python 3.11, FastAPI, NumPy, Pillow, OpenCV | High-speed numeric matrix processing, microservice scale |
| **Mobile** | Flutter 3.x, Riverpod, Dio | Cross-platform native compilation, camera & GPS hardware |

---

## 4. Multi-Tenant Organization Isolation

Every transaction in CivicPulse enforces strict tenant context isolation:
1. `Organization`: Represents a municipality, university campus, or smart city district.
2. `User`: Scoped to an `organizationId` with role-based authorizations.
3. `Incident`: Indexed by `{ organizationId: 1, incidentNumber: 1 }` ensuring cross-tenant data leaks are physically blocked at the database query layer.
4. `WebSocket`: Rooms partitioned via `org:{orgId}` and `emergency:{orgId}`.
