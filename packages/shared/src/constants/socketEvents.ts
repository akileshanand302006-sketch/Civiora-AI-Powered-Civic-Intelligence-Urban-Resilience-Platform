// ============================================================
// Socket.IO Event Constants
// ============================================================
// Single source of truth for real-time event names.
// Used by both backend (emitter) and frontend (listener).
// ============================================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Incidents
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  INCIDENT_ASSIGNED: 'incident:assigned',
  INCIDENT_STATUS_CHANGED: 'incident:statusChanged',
  INCIDENT_ESCALATED: 'incident:escalated',
  INCIDENT_RESOLVED: 'incident:resolved',

  // Emergency
  EMERGENCY_ALERT: 'emergency:alert',
  EMERGENCY_UPDATED: 'emergency:updated',

  // SLA
  SLA_WARNING: 'sla:warning',
  SLA_BREACHED: 'sla:breached',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Verification
  VERIFICATION_REQUESTED: 'verification:requested',
  VERIFICATION_RECEIVED: 'verification:received',

  // Field Worker
  WORKER_LOCATION_UPDATE: 'worker:locationUpdate',
  WORKER_STATUS_CHANGE: 'worker:statusChange',

  // Map
  MAP_INCIDENT_ADD: 'map:incident:add',
  MAP_INCIDENT_REMOVE: 'map:incident:remove',
  MAP_CLUSTER_UPDATE: 'map:cluster:update',

  // System
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_MAINTENANCE: 'system:maintenance',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Room naming conventions */
export const SOCKET_ROOMS = {
  organization: (orgId: string) => `org:${orgId}`,
  department: (deptId: string) => `dept:${deptId}`,
  incident: (incidentId: string) => `incident:${incidentId}`,
  user: (userId: string) => `user:${userId}`,
  emergency: (orgId: string) => `emergency:${orgId}`,
  map: (orgId: string) => `map:${orgId}`,
} as const;
