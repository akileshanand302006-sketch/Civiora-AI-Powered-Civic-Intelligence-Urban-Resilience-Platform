 <div align="center">

# 🏙️ CIVIORA

### AI-Powered Civic Intelligence & Urban Resilience Platform

**Understand the city. Respond intelligently.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Explore%20Civiora-2563eb?style=for-the-badge&logo=vercel&logoColor=white)](https://civioraai.vercel.app/)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=111827)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-AI%20Services-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) [![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/) [![Three.js](https://img.shields.io/badge/Three.js-3D%20Visualisation-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)

*Building a smarter, more connected approach to civic issue management.*

</div>

---

## ✨ Overview

**Civiora** is an AI-assisted civic intelligence platform designed to connect citizens, municipal departments, field workers, and administrators through a unified issue-reporting and resolution workflow.

From road damage and waste accumulation to drainage problems and electrical hazards, Civiora aims to make civic issues easier to report, easier to prioritise, and easier to track.

By combining full-stack web development, geospatial context, role-based workflows, and AI-assisted analysis, the platform provides a foundation for more transparent and data-informed urban operations.

> **Our mission:** Turn civic reports into actionable information and traceable response workflows.

**[🚀 Launch Civiora](https://civioraai.vercel.app/)**

## 🎯 The Problem We Address

Traditional civic complaint processes can suffer from fragmented reporting channels, incomplete location details, delayed assignment, limited progress visibility, and inconsistent communication.

Civiora is designed around one connected lifecycle:

| Stage | Purpose |
|---|---|
| **01 — Report** | Capture an issue, description, location, and supporting evidence. |
| **02 — Analyse** | Validate the report and assist categorisation or prioritisation. |
| **03 — Assign** | Route the issue to an authorised department or field worker. |
| **04 — Respond** | Record field progress and completion details. |
| **05 — Verify** | Review the submitted resolution and update the final status. |
| **06 — Track** | Maintain a clear history of relevant status changes and outcomes. |

## 🚀 Key Platform Capabilities

### 🗺️ Location-Aware Issue Reporting

- Capture civic issue descriptions and available geographic coordinates.
- Explore report locations through map-based interfaces where configured.
- Associate evidence and location information with the relevant report.
- Handle location permissions and accuracy limitations responsibly.

### 🧠 AI-Assisted Civic Intelligence

- Analyse issue images or text using a configured AI service.
- Explore automated issue classification and urgency triage.
- Identify potentially duplicate reports using location and similarity signals.
- Keep predictions reviewable instead of treating them as guaranteed facts.

### 🏙️ Urban Operations & Visualisation

- Present report information through dashboards and operational views.
- Support spatial or 3D visualisation where integrated with live application data.
- Help authorised personnel understand report locations, priorities, and workflow states.
- Provide a foundation for data-informed response planning.

### 👥 Role-Based Workflows

| Role | Primary responsibilities |
|---|---|
| **Citizen** | Submit civic issues, track personal reports, and view permitted updates. |
| **Field Worker** | Access assigned work and record progress or completion evidence. |
| **Department Officer** | Review reports, triage issues, and assign work within authorised scope. |
| **Department Manager** | Monitor operational workload and manage escalations where supported. |
| **Emergency Operator** | Handle emergency-oriented workflows where enabled. |
| **System Administrator** | Manage platform configuration, access policies, and administrative operations. |

Access control must be enforced by the backend. Hiding an action in the frontend alone is not sufficient to protect it.

### ⏱️ Workflow Accountability

- Track report states throughout the issue lifecycle.
- Record meaningful operational events and timestamps where implemented.
- Support response-time and SLA monitoring when configured.
- Connect report updates with document generation and notifications where available.

> **Implementation transparency:** This README describes the platform's architecture and intended capabilities. Verify each feature against the current codebase before presenting it as fully implemented or production-ready.

## 🏗️ System Architecture

Civiora is organised around separate presentation, API, persistence, and AI-processing responsibilities.

```text
                 ┌──────────────────────────┐
                 │      React Frontend      │
                 │ TypeScript · Vite · UI   │
                 │ Dashboards · Maps · Forms│
                 └─────────────┬────────────┘
                               │
                       REST API / WebSocket
                               │
                 ┌─────────────▼────────────┐
                 │       Backend API        │
                 │     Node.js + Express    │
                 │                          │
                 │ Authentication           │
                 │ Authorisation            │
                 │ Report Management        │
                 │ Assignment & Workflows   │
                 └────────┬─────────┬───────┘
                          │         │
                ┌─────────▼───┐ ┌───▼────────────────┐
                │   MongoDB   │ │  Python + FastAPI  │
                │             │ │                    │
                │ Users       │ │ Image Analysis     │
                │ Reports     │ │ Text Classification│
                │ Assignments │ │ Similarity Tasks   │
                │ Events      │ │ AI Inference       │
                └─────────────┘ └────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Responsive user interface |
| 3D visualisation | Three.js / React Three Fiber | Interactive 3D experiences where implemented |
| Backend | Node.js 20, Express, TypeScript | API endpoints and business logic |
| Database | MongoDB, Mongoose | Persistent application data |
| AI microservice | Python, FastAPI | Independent AI inference endpoints |
| Real-time communication | Socket.IO / WebSocket | Live updates, if enabled |
| Background processing | Redis / BullMQ | Queued jobs and retries, if enabled |
| Deployment | Vercel and backend hosting | Web application and API hosting |

Optional components such as Redis, BullMQ, Socket.IO, and individual AI models should only be listed as active dependencies if they exist in the deployed implementation.

## 🤖 AI & Machine Learning

Civiora's AI layer can support several types of civic intelligence tasks.

| Task | Potential technique | Expected output |
|---|---|---|
| Object detection | YOLO-family models | Object class, bounding box, confidence |
| Damage segmentation | Instance or semantic segmentation | Mask or affected-region estimate |
| Text classification | NLP classifiers or transformers | Category or urgency prediction |
| Duplicate detection | Geographic distance and semantic similarity | Candidate duplicate reports |
| Risk prioritisation | Explicit rules or validated predictive models | Priority score and supporting factors |

### Important Model Considerations

- **YOLO:** Detects and localises objects in images.
- **Segmentation models:** Identify the image pixels belonging to an object or region.
- **Transformer-based NLP:** Analyses text to identify categories, intent, or urgency.
- **Sentence embeddings:** Represent text numerically so similar reports can be compared.
- **Geospatial distance:** Helps identify reports occurring near one another.

Model predictions can be incorrect. They should be evaluated on representative data and reviewed by authorised personnel when operational decisions have safety implications.

## 🔐 Security & Reliability

Security should be applied across the frontend, backend, database, and supporting services.

- **Authentication:** Verify the identity of users.
- **Role-based authorisation:** Enforce permissions on protected server endpoints.
- **Data validation:** Reject invalid categories, statuses, and malformed requests.
- **Credential security:** Store secrets in environment variables or a secret manager.
- **Session protection:** Secure token handling and revocation where applicable.
- **File security:** Restrict upload formats, file sizes, and document access.
- **Auditability:** Maintain records of important actions without logging credentials or tokens.
- **Reliable notifications:** Track failures and use safe retry handling when notification services are configured.

These are engineering objectives, not a claim of an independent security audit.

## ⚙️ Getting Started

### Prerequisites

- Node.js `>= 20`
- npm `>= 10`
- Python `>= 3.10` for the AI service
- MongoDB, according to the application configuration
- Docker and Docker Compose if using containerised local services

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Replace the placeholders with the actual repository URL and directory.

### 2. Install Dependencies

```bash
npm install
```

Run this from the repository root if the project uses npm workspaces.

### 3. Configure Environment Variables

Copy the templates that exist in the repository:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

Typical configuration categories include:

| Configuration | Purpose |
|---|---|
| Database URI | Connect to the configured database |
| Authentication secrets | Support secure token operations |
| Frontend API URL | Connect the web app to the backend |
| AI service URL | Connect the backend to the AI service |
| Map API key | Enable map-related capabilities |
| Email provider key | Send notifications, if configured |

Use the exact variable names required by the codebase. Never commit populated environment files or publish production credentials.

### 4. Start Local Dependencies

If the project contains the referenced Compose file:

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 5. Seed Development Data

If the backend exposes the seed script:

```bash
npm run seed --workspace=apps/backend
```

Use demo accounts only in a controlled development environment. Do not deploy known demo credentials to a public production environment.

### 6. Run the Development Services

If these scripts are present in the root `package.json`, start them in separate terminals:

```bash
npm run dev:web
npm run dev:backend
npm run dev:ai
```

Expected addresses in the proposed local configuration:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- AI service: `http://localhost:8000`

Actual ports depend on the current environment configuration.

## 🧪 Build & Verification

Run the scripts available in the repository:

```bash
npm run typecheck
npm run build
npm run --prefix apps/backend start
npm run --prefix apps/web preview
```

### Pre-Release Checklist

- [ ] Frontend builds successfully.
- [ ] Backend starts and connects to the database.
- [ ] Authentication and permissions are enforced on the server.
- [ ] Report creation persists data correctly.
- [ ] Assignment and work-status transitions are validated.
- [ ] File downloads return the correct format and extension.
- [ ] Notification failures are handled without losing saved reports.
- [ ] Location errors and permission denial are handled gracefully.
- [ ] Desktop and mobile layouts are tested.
- [ ] No production secrets are committed.

## 📂 Repository Structure

The following is an illustrative structure based on the proposed architecture. Adjust it to match the actual repository.

```text
civiora/
├── apps/
│   ├── web/          # React + TypeScript frontend
│   ├── backend/      # Node.js + Express API
│   ├── ai-service/   # Python + FastAPI
│   └── mobile/       # Optional mobile client
├── packages/
│   └── shared/       # Optional shared types and schemas
├── docker/           # Dockerfiles and Compose configuration
├── docs/             # Architecture, API and security docs
├── package.json
└── README.md
```

Remove any entry that does not exist in the actual repository.

## 🗺️ Roadmap

- [ ] Improve issue classification and category validation.
- [ ] Expand map-based report exploration.
- [ ] Evaluate AI models using documented datasets and metrics.
- [ ] Strengthen workflow-transition and notification-retry tests.
- [ ] Improve accessibility and mobile responsiveness.
- [ ] Document deployment configuration and security controls.
- [ ] Improve operational monitoring and error reporting.

## 🤝 Contributing

1. Create a feature branch.
2. Keep changes focused and document new configuration requirements.
3. Add or update tests for changed behaviour.
4. Run the available build and validation commands.
5. Submit a pull request with a clear summary and verification steps.

## 📄 License

This project is intended to use the MIT License. Ensure the repository contains a matching `LICENSE` file before distributing the project under that licence.

---

<div align="center">

### CIVIORA

*Better civic reporting. Clearer response workflows.*

**[Explore the Live Application →](https://civioraai.vercel.app/)**

</div>
