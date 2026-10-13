// ============================================================
// Express Application Setup
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import incidentRoutes from './modules/incidents/incident.routes.js';
import orgRoutes from './modules/organizations/org.routes.js';
import userRoutes from './modules/users/user.routes.js';
import locationRoutes from './modules/locations/location.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import securityRoutes from './modules/security/security.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';

const app = express();

// ── Security Headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS (Dynamic origin support for Vercel, Render & Local)
app.use(cors(corsOptions));

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Compression ───────────────────────────────────────────
app.use(compression());

// ── Request ID ────────────────────────────────────────────
app.use(requestIdMiddleware);

// ── Request Logging ───────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('short', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// ── Trust proxy (for rate limiter behind reverse proxy) ──
app.set('trust proxy', 1);

// ── Rate Limiting ─────────────────────────────────────────
app.use(`/api/${env.API_VERSION}/`, apiRateLimiter);

// ── Routes ────────────────────────────────────────────────
const apiPrefix = `/api/${env.API_VERSION}`;

// Health (no auth required, no rate limit) — available at /health, /ready, and /api/v1/health
app.use('/', healthRoutes);
app.use(apiPrefix, healthRoutes);

// Auth
app.use(`${apiPrefix}/auth`, authRoutes);

// Organizations
app.use(`${apiPrefix}/organizations`, orgRoutes);

// Users
app.use(`${apiPrefix}/users`, userRoutes);

// Incidents & Municipal Reports
app.use(`${apiPrefix}/incidents`, incidentRoutes);
app.use(`${apiPrefix}/reports`, incidentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', incidentRoutes);

// Locations & Geospatial Infrastructure
app.use(`${apiPrefix}/locations`, locationRoutes);

// Operations, Work Orders & SLA Policies
app.use(`${apiPrefix}/operations`, operationsRoutes);

// Notifications & Emergency Broadcasts
app.use(`${apiPrefix}/notifications`, notificationRoutes);

// Security Threat & Audit Logs
app.use(`${apiPrefix}/security`, securityRoutes);

// AI Intelligence Engine (YOLO11, PaddleOCR, Qwen2.5-VL, CLIP, YOLO11-seg)
app.use(`${apiPrefix}/ai`, aiRoutes);

// Contact Center & Inquiries
app.use(`${apiPrefix}/contact`, contactRoutes);
app.use('/api/contact', contactRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist',
      requestId: (_req as express.Request).requestId || 'unknown',
    },
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

export default app;
