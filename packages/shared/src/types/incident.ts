// ============================================================
// Incident Types
// ============================================================

import type { IncidentCategory, IncidentStatus, IncidentPriority } from '../constants/incidents';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface IncidentLocation {
  type: 'Point';
  coordinates: [number, number];
  address: string;
  precisionLevel: 'exact' | 'approximate' | 'zone';
  publicCoordinates: [number, number]; // fuzzed for public view
}

export interface RiskFactor {
  factor: string;
  weight: number;
  explanation: string;
}

export interface RiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  calculatedAt: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface NLPExtraction {
  category: string;
  issue: string;
  severity: string;
  impact: string;
  potentialRisk: string;
}

export interface AIAnalysis {
  category: string;
  confidence: number;
  severity: string;
  detectedObjects: string[];
  boundingBoxes?: BoundingBox[];
  nlpExtraction?: NLPExtraction;
  processedAt: string;
  modelVersion: string;
}

export interface ClusterInfo {
  masterIncidentId?: string;
  isMaster: boolean;
  linkedReports: string[];
  totalReports: number;
}

export interface SLAInfo {
  policyId: string;
  deadline: string;
  breached: boolean;
  escalationLevel: number;
  timeRemaining?: number; // seconds
}

export interface CommunityVerificationSummary {
  yesCount: number;
  noCount: number;
  unsureCount: number;
  verificationScore: number;
}

export interface ResolutionInfo {
  resolvedAt: string;
  resolvedBy: string;
  resolutionNotes: string;
  aiResolutionConfidence?: number;
  verifiedByHuman: boolean;
}

export interface TimelineEntry {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface IncidentMetadata {
  source: 'web' | 'mobile' | 'api';
  deviceInfo?: Record<string, unknown>;
  reportingMode: 'standard' | 'emergency' | 'voice' | 'quick';
}

export interface Incident {
  id: string;
  organizationId: string;
  incidentNumber: string;
  category: IncidentCategory;
  subcategory?: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  isEmergency: boolean;
  location: IncidentLocation;
  risk: RiskAssessment;
  ai: AIAnalysis;
  cluster: ClusterInfo;
  sla: SLAInfo;
  departmentId?: string;
  assignedTo?: string;
  reportedBy: string;
  communityVerification: CommunityVerificationSummary;
  evidence: string[];
  resolutionEvidence?: string[];
  resolution?: ResolutionInfo;
  metadata: IncidentMetadata;
  timeline: TimelineEntry[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Compact incident for map markers and lists */
export interface IncidentSummary {
  id: string;
  incidentNumber: string;
  category: IncidentCategory;
  title: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  isEmergency: boolean;
  location: Pick<IncidentLocation, 'publicCoordinates' | 'address'>;
  risk: Pick<RiskAssessment, 'level' | 'score'>;
  communityVerification: Pick<CommunityVerificationSummary, 'verificationScore'>;
  createdAt: string;
}

/** For map clustering */
export interface IncidentMapPoint {
  id: string;
  lng: number;
  lat: number;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  isEmergency: boolean;
}
