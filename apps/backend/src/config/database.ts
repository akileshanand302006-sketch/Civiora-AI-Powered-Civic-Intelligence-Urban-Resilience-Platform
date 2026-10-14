// ============================================================
// Civiora — MongoDB Atlas Enterprise Database Connection
// Connection Pooling • DNS Resolution • Health Monitoring
// ============================================================

import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Ensure public DNS resolver fallback for Windows environments where
// local ISP routers fail to resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

let isConnecting = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  // Prevent duplicate connection attempts during hot reloads or multiple calls
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB Atlas connection already active (state: 1)');
    return mongoose;
  }

  if (isConnecting) {
    logger.debug('MongoDB Atlas connection already in progress...');
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return mongoose;
  }

  isConnecting = true;

  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required but was not provided in server environment variables.');
    }

    // Pre-resolve SRV record with public DNS to warm resolver cache on Windows
    try {
      await dns.promises.resolveSrv('_mongodb._tcp.civiora-db.se5b7wx.mongodb.net');
    } catch {}

    logger.info('Connecting to MongoDB Atlas cluster...');

    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    const sanitizedHost = conn.connection.host || 'Atlas Cluster';
    const dbName = conn.connection.name || 'civiora';
    logger.info(`✅ MongoDB Atlas connected successfully [Database: ${dbName}, Host: ${sanitizedHost}]`);

    // Attach lifecycle event listeners
    mongoose.connection.on('error', (err) => {
      logger.error({ err: err.message }, 'MongoDB Atlas connection error event');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB Atlas connection lost. Mongoose will attempt automatic reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB Atlas reconnected successfully');
    });

    return conn;
  } catch (err: any) {
    if (err.code === 8000 || err.message?.includes('bad auth') || err.message?.includes('authentication failed')) {
      console.error('\n' + '='.repeat(70));
      console.error('🚨 CIVIORA — MONGODB ATLAS AUTHENTICATION ERROR (Code 8000)');
      console.error('='.repeat(70));
      console.error('MongoDB Atlas rejected the database credentials in apps/backend/.env.');
      console.error('\nQuick 30-second fix:');
      console.error('1. Open your MongoDB Atlas browser tab (civiora-db)');
      console.error('2. Navigate to: Security → Database Access');
      console.error('3. Find "akileshanand302006_db_user" (or your active user), click "Edit" → "Edit Password"');
      console.error('4. Update MONGODB_URI in apps/backend/.env with your password:');
      console.error('   MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@civiora-db.se5b7wx.mongodb.net/civiora?retryWrites=true&w=majority');
      console.error('='.repeat(70) + '\n');
    }

    logger.fatal(
      {
        error: err.message,
        code: err.code,
        name: err.name,
      },
      '❌ MongoDB Atlas connection failed'
    );
    throw err;
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB Atlas disconnected cleanly');
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDatabaseConnectionState(): {
  state: number;
  stateText: string;
  databaseName?: string;
  host?: string;
} {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = mongoose.connection.readyState;
  return {
    state,
    stateText: states[state] || 'unknown',
    databaseName: mongoose.connection.name,
    host: mongoose.connection.host,
  };
}
