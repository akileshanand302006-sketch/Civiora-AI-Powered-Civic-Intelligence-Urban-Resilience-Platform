// ============================================================
// Notification Routes
// ============================================================

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getNotifications,
  markAsRead,
  getEmergencyBroadcasts,
  getNotificationOperations,
  retryNotificationDelivery,
} from './notification.controller.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

router.get('/emergency', getEmergencyBroadcasts);

router.use(authenticate);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.get('/operations', requireRole('tenant_admin', 'system_admin'), getNotificationOperations);
router.post('/deliveries/:id/retry', requireRole('tenant_admin', 'system_admin'), retryNotificationDelivery);

export default router;
