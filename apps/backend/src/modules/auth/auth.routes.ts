// ============================================================
// Auth Routes
// ============================================================

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate, checkSessionRevocation } from '../../middleware/authenticate.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@civicpulse/shared';
import { z } from 'zod';

const router = Router();

// Public routes (rate-limited)
router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login,
);

router.post(
  '/mfa/verify',
  authRateLimiter,
  validateRequest({ body: mfaVerifySchema }),
  authController.verifyMfa,
);

router.post(
  '/refresh',
  authRateLimiter,
  validateRequest({ body: z.object({ refreshToken: z.string().min(1) }) }),
  authController.refresh,
);

router.post(
  '/verify-email',
  validateRequest({ body: z.object({ token: z.string().min(1) }) }),
  authController.verifyEmail,
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword,
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  checkSessionRevocation,
  authController.logout,
);

router.post(
  '/logout-all',
  authenticate,
  checkSessionRevocation,
  authController.logoutAll,
);

router.post(
  '/mfa/setup',
  authenticate,
  checkSessionRevocation,
  authController.setupMfa,
);

router.post(
  '/mfa/confirm',
  authenticate,
  checkSessionRevocation,
  validateRequest({ body: z.object({ code: z.string().length(6) }) }),
  authController.confirmMfa,
);

router.get(
  '/me',
  authenticate,
  checkSessionRevocation,
  authController.me,
);

export default router;
