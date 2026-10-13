// ============================================================
// Security & Audit Controller
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { AuditLog } from './auditLog.model.js';
import { SecurityEvent } from './securityEvent.model.js';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const filter: Record<string, any> = {};
    if (orgId && user?.role !== 'system_admin') filter.organizationId = orgId;

    if (req.query.action) filter.action = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'profile email role')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;
    const filter: Record<string, any> = {};
    if (orgId && user?.role !== 'system_admin') filter.organizationId = orgId;

    const events = await SecurityEvent.find(filter).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

export async function getSecuritySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filter: Record<string, any> = {};
    if (orgId && user?.role !== 'system_admin') filter.organizationId = orgId;

    const [totalEvents24h, criticalEvents24h, recentEvents] = await Promise.all([
      SecurityEvent.countDocuments({ ...filter, timestamp: { $gte: oneDayAgo } }),
      SecurityEvent.countDocuments({
        ...filter,
        severity: 'critical',
        timestamp: { $gte: oneDayAgo },
      }),
      SecurityEvent.find(filter).sort({ timestamp: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalEvents24h,
        criticalEvents24h,
        recentEvents,
      },
    });
  } catch (err) {
    next(err);
  }
}
