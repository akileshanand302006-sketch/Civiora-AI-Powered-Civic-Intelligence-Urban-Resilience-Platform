// ============================================================
// Incident Routes
// ============================================================

import { Router } from 'express';
import * as incidentController from './incident.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  createIncidentSchema,
  verificationVoteSchema,
} from '@civicpulse/shared';

const router = Router();

// Public / Citizen / Dashboard routes
router.get('/', optionalAuthenticate, incidentController.list);
router.get('/nearby', optionalAuthenticate, incidentController.getNearby);
router.get('/metrics', optionalAuthenticate, incidentController.metrics);
router.get('/:id', optionalAuthenticate, incidentController.getById);

// Protected routes
router.post(
  '/',
  authenticate,
  validateRequest({ body: createIncidentSchema }),
  incidentController.create,
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole(
    'officer',
    'manager',
    'field_worker',
    'emergency_operator',
    'tenant_admin',
    'system_admin',
  ),
  incidentController.updateStatus,
);

router.post(
  '/:id/assign',
  authenticate,
  requireRole('officer', 'manager', 'tenant_admin', 'system_admin'),
  incidentController.assign,
);

router.post(
  '/:id/resolve',
  authenticate,
  requireRole('officer', 'manager', 'field_worker', 'tenant_admin', 'system_admin'),
  incidentController.resolve,
);

router.post(
  '/:id/verify',
  authenticate,
  validateRequest({ body: verificationVoteSchema }),
  incidentController.verifyVote,
);

export default router;
