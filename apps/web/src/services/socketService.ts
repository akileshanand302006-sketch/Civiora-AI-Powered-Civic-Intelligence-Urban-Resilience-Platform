// ============================================================
// Real-time Socket.IO Client Service
// ============================================================

import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@civicpulse/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const token = localStorage.getItem('cp_access_token');

    socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to CivicPulse Real-Time Gateway');
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Disconnected from Real-Time Gateway:', reason);
    });
  }

  return socket;
}

export function subscribeToIncident(incidentId: string, callback: (data: any) => void): () => void {
  const s = getSocket();
  s.emit('join:incident', incidentId);
  s.on(SOCKET_EVENTS.INCIDENT_STATUS_CHANGED, callback);
  s.on(SOCKET_EVENTS.INCIDENT_UPDATED, callback);

  return () => {
    s.emit('leave:incident', incidentId);
    s.off(SOCKET_EVENTS.INCIDENT_STATUS_CHANGED, callback);
    s.off(SOCKET_EVENTS.INCIDENT_UPDATED, callback);
  };
}

export function subscribeToLiveCityMap(orgId: string, callback: (data: any) => void): () => void {
  const s = getSocket();
  s.emit('join:map', orgId);
  s.on(SOCKET_EVENTS.MAP_INCIDENT_ADD, callback);
  s.on(SOCKET_EVENTS.INCIDENT_CREATED, callback);
  s.on(SOCKET_EVENTS.INCIDENT_RESOLVED, callback);

  return () => {
    s.off(SOCKET_EVENTS.MAP_INCIDENT_ADD, callback);
    s.off(SOCKET_EVENTS.INCIDENT_CREATED, callback);
    s.off(SOCKET_EVENTS.INCIDENT_RESOLVED, callback);
  };
}
