// ============================================================
// Rate Limiter Middleware
// ============================================================

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** General API rate limiter */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      requestId: '',
    },
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For in production (behind proxy)
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/** Strict rate limiter for auth endpoints */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      requestId: '',
    },
  },
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skipSuccessfulRequests: false,
});
