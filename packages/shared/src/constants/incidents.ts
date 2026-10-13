// ============================================================
// Incident Category & Status Constants
// ============================================================

export const INCIDENT_CATEGORIES = {
  POTHOLE: 'pothole',
  ROAD_DAMAGE: 'road_damage',
  GARBAGE_ACCUMULATION: 'garbage_accumulation',
  ILLEGAL_DUMPING: 'illegal_dumping',
  DRAINAGE_BLOCKAGE: 'drainage_blockage',
  WATER_LEAKAGE: 'water_leakage',
  FLOODING: 'flooding',
  BROKEN_STREETLIGHT: 'broken_streetlight',
  DAMAGED_TRAFFIC_SIGNAL: 'damaged_traffic_signal',
  DAMAGED_SIDEWALK: 'damaged_sidewalk',
  FALLEN_TREE: 'fallen_tree',
  PUBLIC_INFRASTRUCTURE_DAMAGE: 'public_infrastructure_damage',
  UNSAFE_PUBLIC_SPACE: 'unsafe_public_space',
  EXPOSED_ELECTRICAL_HAZARD: 'exposed_electrical_hazard',
  TRAFFIC_OBSTRUCTION: 'traffic_obstruction',
  ENVIRONMENTAL_HAZARD: 'environmental_hazard',
  EMERGENCY_INCIDENT: 'emergency_incident',
  OTHER: 'other',
} as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[keyof typeof INCIDENT_CATEGORIES];

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  pothole: 'Pothole',
  road_damage: 'Road Damage',
  garbage_accumulation: 'Garbage Accumulation',
  illegal_dumping: 'Illegal Dumping',
  drainage_blockage: 'Drainage Blockage',
  water_leakage: 'Water Leakage',
  flooding: 'Flooding',
  broken_streetlight: 'Broken Streetlight',
  damaged_traffic_signal: 'Damaged Traffic Signal',
  damaged_sidewalk: 'Damaged Sidewalk',
  fallen_tree: 'Fallen Tree',
  public_infrastructure_damage: 'Public Infrastructure Damage',
  unsafe_public_space: 'Unsafe Public Space',
  exposed_electrical_hazard: 'Exposed Electrical Hazard',
  traffic_obstruction: 'Traffic Obstruction',
  environmental_hazard: 'Environmental Hazard',
  emergency_incident: 'Emergency Incident',
  other: 'Other / Unclassified',
};

export const INCIDENT_CATEGORY_ICONS: Record<IncidentCategory, string> = {
  pothole: 'bi-exclamation-diamond',
  road_damage: 'bi-sign-turn-right',
  garbage_accumulation: 'bi-trash3',
  illegal_dumping: 'bi-x-octagon',
  drainage_blockage: 'bi-droplet-half',
  water_leakage: 'bi-droplet',
  flooding: 'bi-water',
  broken_streetlight: 'bi-lightbulb-off',
  damaged_traffic_signal: 'bi-stoplights',
  damaged_sidewalk: 'bi-bricks',
  fallen_tree: 'bi-tree',
  public_infrastructure_damage: 'bi-building-exclamation',
  unsafe_public_space: 'bi-shield-exclamation',
  exposed_electrical_hazard: 'bi-lightning-charge',
  traffic_obstruction: 'bi-cone-striped',
  environmental_hazard: 'bi-radioactive',
  emergency_incident: 'bi-exclamation-triangle',
  other: 'bi-question-circle',
};

/** Color coding for incident categories */
export const INCIDENT_CATEGORY_COLORS: Record<IncidentCategory, string> = {
  pothole: '#FF6B35',
  road_damage: '#E8590C',
  garbage_accumulation: '#94D82D',
  illegal_dumping: '#FF922B',
  drainage_blockage: '#339AF0',
  water_leakage: '#22B8CF',
  flooding: '#1864AB',
  broken_streetlight: '#FCC419',
  damaged_traffic_signal: '#F06595',
  damaged_sidewalk: '#ADB5BD',
  fallen_tree: '#51CF66',
  public_infrastructure_damage: '#845EF7',
  unsafe_public_space: '#FF6B6B',
  exposed_electrical_hazard: '#FFD43B',
  traffic_obstruction: '#E64980',
  environmental_hazard: '#20C997',
  emergency_incident: '#FA5252',
  other: '#868E96',
};

// ── Statuses ──────────────────────────────────────────────

export const INCIDENT_STATUSES = {
  REPORTED: 'reported',
  VERIFIED: 'verified',
  TRIAGED: 'triaged',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  AWAITING_VERIFICATION: 'awaiting_verification',
  EVIDENCE_SUBMITTED: 'evidence_submitted',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
  REOPENED: 'reopened',
} as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[keyof typeof INCIDENT_STATUSES];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  verified: 'Verified',
  triaged: 'Triaged',
  assigned: 'Assigned',
  accepted: 'Accepted by Field Worker',
  in_progress: 'In Progress',
  awaiting_verification: 'Awaiting Verification',
  evidence_submitted: 'Evidence Submitted',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
  reopened: 'Reopened',
};

/** Valid status transitions (state machine) */
export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  reported: ['verified', 'triaged', 'assigned', 'in_progress', 'rejected'],
  verified: ['triaged', 'assigned', 'in_progress', 'rejected'],
  triaged: ['assigned', 'in_progress', 'rejected'],
  assigned: ['accepted', 'in_progress', 'triaged', 'resolved', 'rejected'],
  accepted: ['in_progress', 'assigned', 'rejected'],
  in_progress: ['awaiting_verification', 'evidence_submitted', 'resolved', 'assigned', 'closed'],
  awaiting_verification: ['resolved', 'in_progress', 'rejected'],
  evidence_submitted: ['awaiting_verification', 'resolved', 'in_progress'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  rejected: ['reported', 'triaged', 'reopened'],
  reopened: ['triaged', 'assigned', 'in_progress'],
};

// ── Priorities ──────────────────────────────────────────────

export const INCIDENT_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[keyof typeof INCIDENT_PRIORITIES];

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  low: '#51CF66',
  medium: '#FCC419',
  high: '#FF922B',
  critical: '#FA5252',
};

// ── Emergency Categories ──────────────────────────────────

export const EMERGENCY_CATEGORIES = {
  FLOOD: 'flood',
  FIRE: 'fire',
  ACCIDENT: 'accident',
  ELECTRICAL_HAZARD: 'electrical_hazard',
  INFRASTRUCTURE_COLLAPSE: 'infrastructure_collapse',
  FALLEN_TREE: 'fallen_tree',
  MAJOR_OBSTRUCTION: 'major_obstruction',
  OTHER: 'other_emergency',
} as const;

export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[keyof typeof EMERGENCY_CATEGORIES];

export const ALL_INCIDENT_CATEGORIES: IncidentCategory[] = Object.values(INCIDENT_CATEGORIES);
export const ALL_INCIDENT_STATUSES: IncidentStatus[] = Object.values(INCIDENT_STATUSES);
export const ALL_INCIDENT_PRIORITIES: IncidentPriority[] = Object.values(INCIDENT_PRIORITIES);
