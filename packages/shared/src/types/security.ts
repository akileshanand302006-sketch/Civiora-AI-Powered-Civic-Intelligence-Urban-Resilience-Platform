// ============================================================
// Security & Audit Types
// ============================================================

export type SecurityEventType =
  | 'failed_login'
  | 'brute_force'
  | 'suspicious_login'
  | 'mfa_failure'
  | 'rate_limit'
  | 'unauthorized_access'
  | 'token_reuse'
  | 'session_anomaly'
  | 'api_anomaly';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  organizationId?: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ip: string;
  details: Record<string, unknown>;
  isResolved: boolean;
  resolvedBy?: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: string;
}

export interface SecurityDashboard {
  activeSessions: number;
  suspiciousLogins24h: number;
  rateLimitEvents24h: number;
  blockedRequests24h: number;
  failedAuth24h: number;
  mfaEvents24h: number;
  recentEvents: SecurityEvent[];
  eventTrend: Array<{ hour: string; count: number; severity: SecuritySeverity }>;
}
