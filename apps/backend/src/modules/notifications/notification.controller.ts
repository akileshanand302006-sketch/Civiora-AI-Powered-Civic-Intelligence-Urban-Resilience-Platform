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
