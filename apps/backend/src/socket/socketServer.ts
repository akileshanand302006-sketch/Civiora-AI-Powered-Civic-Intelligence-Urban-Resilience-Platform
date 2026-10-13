// ============================================================
// Socket.IO Server Setup & Room Management
// ============================================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isAllowedOrigin } from '../config/cors.js';
import { logger } from '../utils/logger.js';
import { SOCKET_ROOMS, type SocketEvent } from '@civicpulse/shared';
import type { JwtPayload } from '../middleware/authenticate.js';

let io: Server | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtPayload;
  };
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Civiora Socket: Origin ${origin} not permitted.`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for WebSocket
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        // Allow anonymous connection for public map view
        return next();
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      // Invalid token - allow connection without user data for public views
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload | undefined;

    if (user) {
      // Join organization room
      socket.join(SOCKET_ROOMS.organization(user.org));

      // Join user specific room
      socket.join(SOCKET_ROOMS.user(user.sub));

      // Join map room for the org
      socket.join(SOCKET_ROOMS.map(user.org));

      // Emergency operators / admins join emergency room
      if (['emergency_operator', 'system_admin', 'tenant_admin', 'manager'].includes(user.role)) {
        socket.join(SOCKET_ROOMS.emergency(user.org));
      }

      logger.debug({ userId: user.sub, role: user.role, org: user.org }, 'Authenticated socket connected');
    } else {
      logger.debug({ socketId: socket.id }, 'Anonymous socket connected');
    }

    // Client can request to join specific incident rooms
    socket.on('join:incident', (incidentId: string) => {
      socket.join(SOCKET_ROOMS.incident(incidentId));
    });

    socket.on('leave:incident', (incidentId: string) => {
      socket.leave(SOCKET_ROOMS.incident(incidentId));
    });

    // Client can request to join map room for public incident updates
    socket.on('join:map', (orgId: string) => {
      socket.join(SOCKET_ROOMS.map(orgId));
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('🔌 Socket.IO server initialized');
  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketServer first.');
  }
  return io;
}

/** Emit event to all clients in an organization */
export function emitToOrg(orgId: string, event: SocketEvent, data: unknown): void {
  if (!io) return;
  io.to(SOCKET_ROOMS.organization(orgId)).emit(event, data);
}

/** Emit event to a specific user */
export function emitToUser(userId: string, event: SocketEvent, data: unknown): void {
  if (!io) return;
  io.to(SOCKET_ROOMS.user(userId)).emit(event, data);
}

/** Emit event to the emergency response team */
export function emitEmergency(orgId: string, event: SocketEvent, data: unknown): void {
  if (!io) return;
  io.to(SOCKET_ROOMS.emergency(orgId)).emit(event, data);
}

/** Emit event to clients viewing an incident detail page */
export function emitToIncident(incidentId: string, event: SocketEvent, data: unknown): void {
  if (!io) return;
  io.to(SOCKET_ROOMS.incident(incidentId)).emit(event, data);
}

/** Emit incident map update to live city map viewers */
export function emitToMap(orgId: string, event: SocketEvent, data: unknown): void {
  if (!io) return;
  io.to(SOCKET_ROOMS.map(orgId)).emit(event, data);
}
