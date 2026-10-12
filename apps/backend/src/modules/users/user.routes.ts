// ============================================================
// User Routes
// ============================================================

import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';

const router = Router();

// Current user profile routes
router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, userController.updateMe);

// Current user location preferences & saved places
router.put('/me/locations/active', authenticate, userController.updateActiveLocation);
router.get('/me/locations', authenticate, userController.getSavedLocations);
router.post('/me/locations', authenticate, userController.addSavedLocation);
router.delete('/me/locations/:locationId', authenticate, userController.deleteSavedLocation);

// Organization user directory
router.get(
  '/',
  authenticate,
  requireRole('officer', 'manager', 'tenant_admin', 'system_admin'),
  userController.list,
);

router.get(
  '/:id',
  authenticate,
  requireRole('officer', 'manager', 'tenant_admin', 'system_admin'),
  userController.getById,
);

router.patch(
  '/:id/role',
  authenticate,
  requireRole('tenant_admin', 'system_admin'),
  userController.updateRole,
);

export default router;
