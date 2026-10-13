// ============================================================
// Notification Controller
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { Notification } from './notification.model.js';
import { EmergencyEvent } from './emergencyEvent.model.js';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 30;

    const notifications = await Notification.find({
      userId: user.userId,
      organizationId: user.organizationId,
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      userId: user.userId,
      organizationId: user.organizationId,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany(
        { userId: user.userId, organizationId: user.organizationId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      res.json({ success: true, message: 'All notifications marked as read' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

export async function getEmergencyBroadcasts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const filter: Record<string, any> = { isActive: true };
    if (user?.organizationId) filter.organizationId = user.organizationId;

    const broadcasts = await EmergencyEvent.find(filter).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: broadcasts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notifications/operations
 * Platform-wide administrative notification delivery metrics & delivery audit log
 */
export async function getNotificationOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { DispatchRecord } = await import('../reports/dispatch.model.js');
    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    const query: Record<string, any> = {};
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (search) {
      query.$or = [
        { incidentNumber: { $regex: search, $options: 'i' } },
        { recipientEmail: { $regex: search, $options: 'i' } },
        { reporterName: { $regex: search, $options: 'i' } },
      ];
    }

    const [dispatches, totalNotifications, inAppCount, sentCount, failedCount] = await Promise.all([
      DispatchRecord.find(query).sort({ createdAt: -1 }).limit(100).lean(),
      DispatchRecord.countDocuments({}),
      Notification.countDocuments({}),
      DispatchRecord.countDocuments({ status: 'sent' }),
      DispatchRecord.countDocuments({ status: 'failed' }),
    ]);

    const stats = {
      total: totalNotifications + inAppCount,
      emailDispatches: totalNotifications,
      inAppAlerts: inAppCount,
      accepted: sentCount,
      delivered: sentCount,
      failed: failedCount,
      pending: totalNotifications - (sentCount + failedCount),
      successRate: totalNotifications > 0 ? Math.round((sentCount / totalNotifications) * 100) : 100,
    };

    res.json({
      success: true,
      data: {
        stats,
        deliveries: dispatches,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/notifications/deliveries/:id/retry
 * Safe, idempotent retry of failed notification deliveries with backoff logging
 */
export async function retryNotificationDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { DispatchRecord } = await import('../reports/dispatch.model.js');
    const { dispatchIncidentReport } = await import('../reports/dispatch.service.js');
    const { Incident } = await import('../incidents/incident.model.js');
    const { buildIncidentReportDTO } = await import('../reports/report.dto.js');

    const record = await DispatchRecord.findById(id);
    if (!record) {
      res.status(404).json({ success: false, error: { message: 'Dispatch record not found' } });
      return;
    }

    const incident = await Incident.findById(record.incidentId);
    if (!incident) {
      res.status(404).json({ success: false, error: { message: 'Incident associated with delivery not found' } });
      return;
    }

    const idempotencyKey = `retry-${record._id}-${Date.now()}`;
    const dto = buildIncidentReportDTO(incident, {
      name: record.reporterName,
      email: record.reporterEmail,
      phone: record.reporterPhone,
      additionalMessage: record.additionalMessage,
      consent: true,
    });

    const result = await dispatchIncidentReport(dto, idempotencyKey);

    record.status = result.status as any;
    if (result.providerMessageId) record.providerMessageId = result.providerMessageId;
    if (result.error) record.errorMessage = result.error;
    record.completedAt = new Date();
    await record.save();

    res.json({
      success: result.success,
      data: {
        recordId: record._id,
        status: record.status,
        providerMessageId: record.providerMessageId,
        message: result.message,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
