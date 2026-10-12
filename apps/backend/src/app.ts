// ============================================================
// Express Application Setup
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
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

const app = express();

// ── Security Headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: env.WS_CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
}));

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

// Health (no auth required, no rate limit)
app.use(apiPrefix, healthRoutes);

// Auth
app.use(`${apiPrefix}/auth`, authRoutes);

// Organizations
app.use(`${apiPrefix}/organizations`, orgRoutes);

// Users
app.use(`${apiPrefix}/users`, userRoutes);

// Incidents
app.use(`${apiPrefix}/incidents`, incidentRoutes);

// Locations & Geospatial Infrastructure
app.use(`${apiPrefix}/locations`, locationRoutes);

// Operations, Work Orders & SLA Policies
app.use(`${apiPrefix}/operations`, operationsRoutes);

// Notifications & Emergency Broadcasts
app.use(`${apiPrefix}/notifications`, notificationRoutes);

// Security Threat & Audit Logs
app.use(`${apiPrefix}/security`, securityRoutes);

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
