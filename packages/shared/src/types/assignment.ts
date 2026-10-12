// ============================================================
// Assignment Types
// ============================================================

export type AssignmentStatus =
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'on_site'
  | 'in_progress'
  | 'evidence_submitted'
  | 'verification'
  | 'completed'
  | 'rejected'
  | 'reassigned';

export interface AssignmentTimelineEntry {
  status: AssignmentStatus;
  timestamp: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  notes?: string;
}

export interface Assignment {
  id: string;
  organizationId: string;
  incidentId: string;
  assignedTo: string;
  assignedBy: string;
  status: AssignmentStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  workerLocation?: { type: 'Point'; coordinates: [number, number] };
  timeline: AssignmentTimelineEntry[];
  estimatedArrival?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** SLA policy definition */
export interface SLAPolicy {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  priority: string;
  isEmergency: boolean;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationRules: Array<{
    level: number;
    afterMinutes: number;
    notifyRoles: string[];
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
