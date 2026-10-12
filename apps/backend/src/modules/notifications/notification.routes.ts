// ============================================================
// Notification Routes
// ============================================================

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getNotifications,
  markAsRead,
  getEmergencyBroadcasts,
} from './notification.controller.js';

const router = Router();

router.get('/emergency', getEmergencyBroadcasts);

router.use(authenticate);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;
