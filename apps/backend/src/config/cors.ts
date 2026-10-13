// ============================================================
// Civiora Production CORS & Origin Security Configuration
// Dynamic Origin Resolution for Vercel, Render & Local Development
// ============================================================

import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Validates whether an incoming HTTP/WebSocket request origin is permitted.
 * Supports:
 *  - Configured WS_CORS_ORIGIN & APP_URL
 *  - Vercel production and preview subdomains (*.vercel.app)
 *  - Render deployments (*.onrender.com)
 *  - Local development environments (localhost, 127.0.0.1)
 *  - Server-to-server / health check requests (null / undefined origin)
 */
export function isAllowedOrigin(rawOrigin: string | undefined): boolean {
  // Allow server-to-server, curl, Postman, Render health checks (no origin header)
  if (!rawOrigin) {
    return true;
  }

  // Normalize origin (remove trailing slash and whitespace)
  const origin = rawOrigin.trim().replace(/\/+$/, '');

  // Configured explicit origins from environment
  const explicitOrigins = [
    'https://civioraai.vercel.app',
    'https://civiora.vercel.app',
    'https://civiora-api-6dij.onrender.com',
    'https://civiora-api.onrender.com',
    ...env.WS_CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, '')),
    env.APP_URL.trim().replace(/\/+$/, ''),
    env.FRONTEND_URL.trim().replace(/\/+$/, ''),
  ].filter(Boolean);

  if (explicitOrigins.includes(origin)) {
    return true;
  }

  // Local development (localhost, 127.0.0.1 on any port)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  // Vercel production and branch preview URLs: https://<project-name>.vercel.app
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(origin)) {
    return true;
  }

  // Render internal/public URLs: https://<service-name>.onrender.com
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*onrender\.com$/.test(origin)) {
    return true;
  }

  logger.warn({ origin }, '[CORS] Rejected unauthorized origin request');
  return false;
}

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Civiora CORS: Origin ${origin} not permitted.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Cache-Control'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
};
