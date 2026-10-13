// ============================================================
// Global Error Handler
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId || 'unknown';

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.reduce(
      (acc, e) => {
        const path = e.path.join('.');
        acc[path] = e.message;
        return acc;
      },
      {} as Record<string, string>,
    );

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        requestId,
      },
    });
    return;
  }

  // Known operational errors (robust check supporting cross-module bundling)
  const isAppError =
    err instanceof AppError ||
    (err && typeof (err as any).statusCode === 'number' && typeof (err as any).code === 'string');

  if (isAppError) {
    const appErr = err as AppError;
    const statusCode = appErr.statusCode || 500;
    if (statusCode >= 500) {
      logger.error({ err, requestId }, appErr.message);
    } else {
      logger.warn({ requestId, code: appErr.code }, appErr.message);
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: appErr.code,
        message: appErr.message,
        details: appErr.details,
        requestId,
      },
    });
    return;
  }

  // Mongoose duplicate key error
  const rawErr = err as unknown as Record<string, unknown>;
  if (rawErr.code === 11000) {
    const keyValue = rawErr.keyValue as Record<string, unknown>;
    const field = Object.keys(keyValue || {})[0] || 'field';

    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `A record with this ${field} already exists`,
        requestId,
      },
    });
    return;
  }

  // Unknown / unhandled errors
  logger.error({ err, requestId }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      requestId,
    },
  });
}
