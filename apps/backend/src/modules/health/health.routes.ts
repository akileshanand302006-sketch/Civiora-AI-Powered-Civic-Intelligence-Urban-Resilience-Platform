// ============================================================
// Health Check Routes
// ============================================================

import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { getRedis } from '../../config/redis.js';
import { runDatabaseSeed } from '../../seed/seed.js';

const router = Router();

/**
 * GET /health — liveness probe
 * Returns 200 if the process is running.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'civicpulse-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * POST /seed — on-demand database seed
 */
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    await runDatabaseSeed();
    res.json({
      success: true,
      message: 'Civiora database successfully seeded with demo personas, SLA policies, and digital twin assets',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /ready — readiness probe
 * Returns 200 only if all dependencies are connected.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // MongoDB
  try {
    const start = Date.now();
    const state = mongoose.connection.readyState;
    checks.mongodb = {
      status: state === 1 ? 'connected' : 'disconnected',
      latencyMs: Date.now() - start,
    };
  } catch {
    checks.mongodb = { status: 'error' };
  }

  // Redis
  try {
    const start = Date.now();
    const redis = getRedis();
    await redis.ping();
    checks.redis = {
      status: 'connected',
      latencyMs: Date.now() - start,
    };
  } catch {
    checks.redis = { status: 'error' };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'connected');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
