// ============================================================
// Auth Controller
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'Registration successful. Please check your email to verify your account.',
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    if (result.mfaRequired) {
      res.json({
        success: true,
        data: {
          mfaRequired: true,
          mfaToken: result.mfaToken,
        },
        requestId: req.requestId,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        mfaRequired: false,
        requiresMfa: false,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
        expiresIn: result.expiresIn,
        user: result.user,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { mfaToken, code } = req.body;
    const result = await authService.verifyMfa(mfaToken, code);

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await authService.logout(req.user.sessionId);
    }

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await authService.logoutAll(req.user.sub);
    }

    res.json({
      success: true,
      data: { message: 'All sessions revoked' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.verifyEmail(req.body.token);

    res.json({
      success: true,
      data: { message: 'Email verified successfully' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.requestPasswordReset(req.body.email, req.body.organizationSlug);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      data: { message: 'If an account exists, a password reset link has been sent.' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);

    res.json({
      success: true,
      data: { message: 'Password reset successful. Please log in with your new password.' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function setupMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.setupMfa(req.user!.sub);

    res.json({
      success: true,
      data: result,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmMfa(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.confirmMfa(req.user!.sub, req.body.code);

    res.json({
      success: true,
      data: { message: 'MFA enabled successfully' },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const { User } = await import('../users/user.model.js');
    const user = await User.findById(req.user!.sub);

    res.json({
      success: true,
      data: { user },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
