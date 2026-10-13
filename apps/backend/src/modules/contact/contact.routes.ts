// ============================================================
// Civiora - Contact Routes
// ============================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as contactController from './contact.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { env } from '../../config/env.js';

const router = Router();

// Dedicated rate limiter for public contact form submissions
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 500 : 10, // 10 per 15 mins in production
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'CONTACT_RATE_LIMIT_EXCEEDED',
      message: 'Too many contact inquiries sent from this address. Please wait a few minutes before trying again.',
    },
  },
});

// Public contact submission
router.post('/', contactRateLimiter, contactController.submitInquiry);

// Administrative view of inquiries
router.get(
  '/',
  authenticate,
  requireRole('manager', 'tenant_admin', 'system_admin'),
  contactController.listInquiries,
);

export default router;
