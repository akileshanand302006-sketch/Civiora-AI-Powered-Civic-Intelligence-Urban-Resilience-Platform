// ============================================================
// Security Routes
// ============================================================

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getAuditLogs,
  getSecurityEvents,
  getSecuritySummary,
} from './security.controller.js';

const router = Router();

router.use(authenticate);

router.get('/audit-logs', getAuditLogs);
router.get('/events', getSecurityEvents);
router.get('/summary', getSecuritySummary);

export default router;
