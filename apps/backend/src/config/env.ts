// ============================================================
// Environment Configuration
// ============================================================
// Validates all required environment variables at startup.
// Fails fast with clear messages if anything is missing.
// ============================================================

import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Load .env automatically if not already loaded into process.env
if (!process.env.MONGODB_URI && typeof process.loadEnvFile === 'function') {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        process.loadEnvFile(p);
        break;
      } catch {}
    }
  }
}

const envSchema = z.object({
  // General
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('Civiora'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // MongoDB
  MONGODB_URI: z
    .string()
    .default(
      'mongodb+srv://akileshanand302006_db_user:ihFDsbZcewnLkfiC@civiora-db.se5b7wx.mongodb.net/civiora?retryWrites=true&w=majority&appName=civiora-db'
    ),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32).default('civiora-dev-access-secret-minimum-32-characters-secure'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32).default('civiora-dev-refresh-secret-minimum-32-characters-secure'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_MFA_SECRET: z.string().min(32).default('civiora-dev-mfa-secret-minimum-32-characters-secure'),
  JWT_MFA_EXPIRY: z.string().default('5m'),

  // Argon2
  ARGON2_MEMORY_COST: z.coerce.number().default(65536),
  ARGON2_TIME_COST: z.coerce.number().default(3),
  ARGON2_PARALLELISM: z.coerce.number().default(4),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_PRESET: z.string().default('civicpulse_evidence'),

  // AI Service
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_KEY: z.string().default('dev-ai-service-key'),

  // Email & Resend Delivery Provider
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'console']).default('resend'),
  EMAIL_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default('onboarding@resend.dev'),
  MUNICIPAL_RECEIVER_EMAIL: z.string().default('akileshanand302006@gmail.com'),
  EMAIL_DELIVERY_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // WebSocket
  WS_CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000), // 15 min
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const missing = Object.entries(formatted)
      .filter(([key, val]) => key !== '_errors' && val && typeof val === 'object' && '_errors' in val)
      .map(([key, val]) => `  ${key}: ${(val as { _errors: string[] })._errors.join(', ')}`)
      .join('\n');

    console.error('❌ Environment validation failed:\n' + missing);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
