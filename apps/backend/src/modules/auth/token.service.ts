// ============================================================
// Token Service
// ============================================================
// Handles JWT generation, refresh token rotation, and
// token family tracking for revocation.
// ============================================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import type { JwtPayload } from '../../middleware/authenticate.js';
import type { IUser } from '../users/user.model.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate an access token (JWT) containing user identity claims.
 */
export function generateAccessToken(
  user: IUser,
  sessionId: string,
): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user._id.toString(),
    org: user.organizationId.toString(),
    role: user.role as JwtPayload['role'],
    email: user.email,
    sessionId,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
    issuer: 'civicpulse',
    audience: 'civicpulse-api',
  });
}

/**
 * Generate an opaque refresh token (random bytes, not JWT).
 * Store a hash — never store the raw token.
 */
export function generateRefreshToken(): {
  token: string;
  hash: string;
} {
  const token = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Verify a refresh token against a stored hash.
 */
export function verifyRefreshToken(token: string, storedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generate a token family ID for refresh token rotation tracking.
 */
export function generateTokenFamily(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a short-lived MFA token (used between login and MFA verification).
 */
export function generateMfaToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, sessionId, purpose: 'mfa' },
    env.JWT_MFA_SECRET,
    { expiresIn: env.JWT_MFA_EXPIRY as any },
  );
}

/**
 * Verify an MFA token.
 */
export function verifyMfaToken(token: string): { sub: string; sessionId: string } {
  const payload = jwt.verify(token, env.JWT_MFA_SECRET) as {
    sub: string;
    sessionId: string;
    purpose: string;
  };

  if (payload.purpose !== 'mfa') {
    throw new Error('Invalid MFA token purpose');
  }

  return { sub: payload.sub, sessionId: payload.sessionId };
}

/**
 * Generate a random token for email verification / password reset.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage (email verification, password reset).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Calculate expiry duration in seconds from a string like "15m", "7d" */
export function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}
