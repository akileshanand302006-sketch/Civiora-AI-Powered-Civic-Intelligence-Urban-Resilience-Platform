// ============================================================
// Operations & Assignments Routes
// ============================================================

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  getSLAPolicies,
  updateWorkerHeartbeat,
} from './operations.controller.js';

const router = Router();

router.use(authenticate);

router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.patch('/assignments/:id/status', updateAssignmentStatus);
router.get('/sla-policies', getSLAPolicies);
router.post('/workers/heartbeat', updateWorkerHeartbeat);

export default router;
