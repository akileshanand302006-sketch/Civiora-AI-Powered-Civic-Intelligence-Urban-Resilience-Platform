// ============================================================
// Location Routes
// ============================================================

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  setActiveLocation,
  getSavedLocations,
  addSavedLocation,
  getZones,
  getInfrastructureAssets,
  getNearbyIncidentsAndAssets,
} from './location.controller.js';

const router = Router();

// Public / Authenticated nearby lookup
router.get('/nearby', getNearbyIncidentsAndAssets);
router.get('/zones', getZones);
router.get('/infrastructure', getInfrastructureAssets);

// User-specific saved locations (protected)
router.use(authenticate);
router.post('/active', setActiveLocation);
router.get('/saved', getSavedLocations);
router.post('/saved', addSavedLocation);

export default router;
