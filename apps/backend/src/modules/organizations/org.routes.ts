// ============================================================
// Organization Routes
// ============================================================

import { Router } from 'express';
import * as orgController from './org.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createOrganizationSchema } from '@civicpulse/shared';

const router = Router();

router.get('/', orgController.list);
router.get('/:slug', orgController.getBySlug);

router.post(
  '/',
  authenticate,
  requireRole('system_admin'),
  validateRequest({ body: createOrganizationSchema }),
  orgController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireRole('system_admin', 'tenant_admin'),
  orgController.update,
);

export default router;
