// ============================================================
// Notification Types
// ============================================================

export type NotificationType =
  | 'incident_created'
  | 'incident_assigned'
  | 'incident_status_changed'
  | 'incident_resolved'
  | 'incident_escalated'
  | 'sla_warning'
  | 'sla_breached'
  | 'verification_requested'
  | 'verification_received'
  | 'emergency_alert'
  | 'field_worker_assigned'
  | 'evidence_submitted'
  | 'security_alert'
  | 'system_announcement';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
