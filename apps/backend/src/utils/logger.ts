// ============================================================
// Structured Logger (Pino)
// ============================================================

import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.LOG_FORMAT === 'pretty' && env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    service: env.APP_NAME,
    env: env.NODE_ENV,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/** Create a child logger with request context */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}
