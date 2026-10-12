// ============================================================
// Authorization Middleware (RBAC + ABAC)
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { type Permission, hasAnyPermission, hasAllPermissions } from '@civicpulse/shared';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { Role } from '@civicpulse/shared';

/**
 * Require the user to have ALL of the specified permissions.
 */
export function requirePermissions(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!hasAllPermissions(req.user.role, permissions)) {
      return next(new ForbiddenError(`Missing required permissions: ${permissions.join(', ')}`));
    }

    next();
  };
}

/**
 * Require the user to have ANY of the specified permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return next(new ForbiddenError());
    }

    next();
  };
}

/**
 * Require the user to have one of the specified roles.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`This action requires one of: ${roles.join(', ')}`));
    }

    next();
  };
}

/**
 * Ensure the authenticated user belongs to the organization
 * referenced in the request parameters.
 * This is the multi-tenant isolation guard.
 */
export function requireTenantAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  // System admins can access any tenant
  if (req.user.role === 'system_admin') {
    return next();
  }

  const orgIdParam = req.params.organizationId || req.body?.organizationId;
  if (orgIdParam && orgIdParam !== req.user.org) {
    return next(new ForbiddenError('Access denied: wrong organization'));
  }

  next();
}
