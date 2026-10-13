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
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  completeWorkSession,
  getIncidentWorkSession,
  approveIncidentResolution,
  rejectIncidentResolution,
} from './operations.controller.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

// Work Orders & Assignments
router.get('/assignments', getAssignments);
router.post('/assignments', requireRole('officer', 'manager', 'tenant_admin', 'system_admin'), createAssignment);
router.patch('/assignments/:id/status', updateAssignmentStatus);
router.get('/sla-policies', getSLAPolicies);
router.post('/workers/heartbeat', updateWorkerHeartbeat);

// Work Session Tracking (Field Workers)
router.post('/work/start', startWorkSession);
router.post('/work/:id/pause', pauseWorkSession);
router.post('/work/:id/resume', resumeWorkSession);
router.post('/work/:id/complete', completeWorkSession);
router.get('/work/incident/:incidentId', getIncidentWorkSession);

// Resolution Review & Verification (Managers & Officers)
router.post('/incidents/:id/approve-resolution', requireRole('officer', 'manager', 'tenant_admin', 'system_admin'), approveIncidentResolution);
router.post('/incidents/:id/reject-resolution', requireRole('officer', 'manager', 'tenant_admin', 'system_admin'), rejectIncidentResolution);

export default router;
