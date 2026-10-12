// ============================================================
// Authentication Middleware
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { cache } from '../config/redis.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { Role } from '@civicpulse/shared';

export interface JwtPayload {
  sub: string;         // userId
  org: string;         // organizationId
  role: Role;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      organizationId?: string;
    }
  }
}

/**
 * Verifies the JWT access token from the Authorization header.
 * Populates req.user and req.organizationId.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    req.user = decoded;
    req.organizationId = decoded.org;

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token'));
    } else {
      next(err);
    }
  }
}

/**
 * Optional authentication — doesn't fail if no token is present,
 * but populates req.user if a valid token exists.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    req.organizationId = decoded.org;
  } catch {
    // silently ignore invalid token for optional auth
  }

  next();
}

export const optionalAuthenticate = optionalAuth;

/**
 * Check if a session has been revoked (via Redis blacklist).
 */
export async function checkSessionRevocation(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    return next();
  }

  try {
    const revoked = await cache.get<boolean>(`revoked:session:${req.user.sessionId}`);
    if (revoked) {
      throw new UnauthorizedError('Session has been revoked');
    }
    next();
  } catch (err) {
    next(err);
  }
}
