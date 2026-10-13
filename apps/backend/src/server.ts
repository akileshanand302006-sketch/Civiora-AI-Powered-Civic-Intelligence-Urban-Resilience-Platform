// ============================================================
// CivicPulse Server Entry Point
// ============================================================

import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initializeDatabaseIndexes } from './config/initIndexes.js';
import { disconnectRedis } from './config/redis.js';
import { initSocketServer } from './socket/socketServer.js';
import { logger } from './utils/logger.js';
import { User } from './modules/users/user.model.js';
import { runDatabaseSeed } from './seed/seed.js';

async function bootstrap(): Promise<void> {
  logger.info(`
  ╔══════════════════════════════════════════════════╗
  ║                    CIVIORA                       ║
  ║   AI-Powered Civic Intelligence Platform         ║
  ╚══════════════════════════════════════════════════╝
  `);

  // Connect to databases
  await connectDatabase();

  // Auto-seed demo personas and organization if database is unseeded
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      logger.info('🌱 Database has 0 users. Auto-seeding default operational personas...');
      await runDatabaseSeed();
      logger.info('✅ Database auto-seeded successfully.');
    }
  } catch (seedErr) {
    logger.warn({ err: seedErr }, 'Database auto-seed check notice');
  }
  
  // Initialize and verify all collection indexes (2dsphere, unique, compound, TTL)
  initializeDatabaseIndexes().catch((err) => {
    logger.warn({ err }, 'Background index initialization encountered warning');
  });

  // Start HTTP server only after database is ready
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Civiora API running on port ${env.PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 API: ${env.API_URL}/api/${env.API_VERSION}`);
    logger.info(`🏥 Health: ${env.API_URL}/api/${env.API_VERSION}/health`);
  });

  // Initialize Socket.IO real-time server
  initSocketServer(server);

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await disconnectDatabase();
        await disconnectRedis();

        logger.info('All connections closed. Goodbye.');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });
  }

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
