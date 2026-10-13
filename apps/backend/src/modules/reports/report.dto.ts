// ============================================================
// Civiora Incident Report Data Transfer Object (DTO)
// Authoritative, normalized schema for PDFs, emails, and exports
// ============================================================

import { INCIDENT_CATEGORY_LABELS, type IncidentCategory, type IncidentStatus, type IncidentPriority } from '@civicpulse/shared';
import type { IEvidence } from '../incidents/evidence.model.js';

export interface ReporterContactInput {
  name?: string;
  email?: string;
  phone?: string;
  additionalMessage?: string;
  consent?: boolean;
}

export interface IncidentReportDTO {
  // Identification
  incidentId: string;
  incidentNumber: string;
  title: string;
  description: string;
  category: IncidentCategory;
  categoryLabel: string;
  subcategory?: string;
  status: IncidentStatus;
  statusLabel: string;
  priority: IncidentPriority;
  isEmergency: boolean;
  createdAt: string;
  updatedAt: string;

  // Location
  location: {
    address: string;
    coordinates: [number, number]; // [lat, lng]
    latitude: number;
    longitude: number;
    district?: string;
    city?: string;
    state?: string;
    precisionLevel: 'exact' | 'approximate' | 'zone';
    googleMapsUrl: string;
  };

  // AI & Neural Analysis
  aiFindings: {
    suggestedCategory?: string;
    confidence?: number;
    severity?: string;
    detectedObjects: string[];
    nlpIssue?: string;
    nlpImpact?: string;
    modelVersion?: string;
    processedAt?: string;
  };

  // Risk & Urgency Scoring
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      factor: string;
      weight: number;
      explanation: string;
    }>;
  };

  // Operational & Municipal Assignment
  operations: {
    departmentName?: string;
    assignedToName?: string;
    assignedToRole?: string;
    slaDeadline?: string;
    slaBreached?: boolean;
    escalationLevel?: number;
  };

  // Reporter Information (Subject to user consent)
  reporter: {
    name: string;
    email: string;
    phone?: string;
    additionalMessage?: string;
    consentGiven: boolean;
  };

  // Visual Evidence Images
  evidence: Array<{
    url: string;
    type: string;
    fileSize?: number;
    capturedAt?: string;
  }>;

  // Resolution Details (if resolved)
  resolution?: {
    resolvedAt: string;
    resolvedByName: string;
    resolutionNotes: string;
    verifiedByHuman: boolean;
  };
}

function toIsoSafe(val: unknown, fallback?: string): string {
  if (!val) return fallback || new Date().toISOString();
  const d = new Date(val as any);
  return isNaN(d.getTime()) ? (fallback || new Date().toISOString()) : d.toISOString();
}

function toIsoSafeOptional(val: unknown): string | undefined {
  if (!val) return undefined;
  const d = new Date(val as any);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Transforms an Incident Mongoose document into a normalized IncidentReportDTO.
 */
export function buildIncidentReportDTO(
  incident: any,
  reporterInput?: ReporterContactInput,
  evidences?: IEvidence[]
): IncidentReportDTO {
  const cat = incident.category as IncidentCategory;
  const catLabel = (INCIDENT_CATEGORY_LABELS as Record<string, string>)[cat] || cat;

  const lat = incident.location?.coordinates?.[1] || 11.0289;
  const lng = incident.location?.coordinates?.[0] || 77.0279;

  // Extract reporter profile
  const rawReporter = incident.reportedBy;
  const defaultReporterName =
    rawReporter?.profile?.firstName
      ? `${rawReporter.profile.firstName} ${rawReporter.profile.lastName || ''}`.trim()
      : 'Civiora Verified Citizen';
  const defaultReporterEmail = rawReporter?.email || 'citizen@civiora.app';

  const reporterName = reporterInput?.name?.trim() || defaultReporterName;
  const reporterEmail = reporterInput?.email?.trim() || defaultReporterEmail;
  const reporterPhone = reporterInput?.phone?.trim() || '';
  const additionalMessage = reporterInput?.additionalMessage?.trim() || '';
  const consentGiven = reporterInput?.consent !== false;

  // Visual evidence URLs
  const evidenceList = (evidences || incident.evidence || [])
    .filter((e: any) => e && (e.storageUrl || e.url))
    .map((e: any) => ({
      url: e.storageUrl || e.url,
      type: e.type || 'image',
      fileSize: e.fileSize,
      capturedAt: toIsoSafeOptional(e.createdAt),
    }));

  return {
    incidentId: incident._id?.toString() || incident.id,
    incidentNumber: incident.incidentNumber || `CP-${Date.now().toString(36).toUpperCase()}`,
    title: incident.title,
    description: incident.description,
    category: cat,
    categoryLabel: catLabel,
    subcategory: incident.subcategory,
    status: incident.status,
    statusLabel: (incident.status || 'reported').replace(/_/g, ' ').toUpperCase(),
    priority: incident.priority,
    isEmergency: !!incident.isEmergency,
    createdAt: toIsoSafe(incident.createdAt),
    updatedAt: toIsoSafe(incident.updatedAt),

    location: {
      address: incident.location?.address || 'Tamil Nadu Municipal Jurisdiction',
      coordinates: [lat, lng],
      latitude: lat,
      longitude: lng,
      district: incident.location?.district || 'Coimbatore',
      city: incident.location?.city || 'Coimbatore',
      state: 'Tamil Nadu',
      precisionLevel: incident.location?.precisionLevel || 'exact',
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },

    aiFindings: {
      suggestedCategory: incident.ai?.category,
      confidence: incident.ai?.confidence,
      severity: incident.ai?.severity,
      detectedObjects: incident.ai?.detectedObjects || [],
      nlpIssue: incident.ai?.nlpExtraction?.issue,
      nlpImpact: incident.ai?.nlpExtraction?.impact,
      modelVersion: incident.ai?.modelVersion || 'Civiora Neural Engine v2.4 (YOLO11+Qwen2.5-VL)',
      processedAt: toIsoSafeOptional(incident.ai?.processedAt),
    },

    risk: {
      score: incident.risk?.score || (incident.isEmergency ? 95 : 75),
      level: incident.risk?.level || (incident.isEmergency ? 'critical' : 'high'),
      factors: incident.risk?.factors || [
        { factor: 'Road Surface Distress', weight: 0.85, explanation: 'Vehicle trajectory impact risk' },
        { factor: 'Municipal Density', weight: 0.70, explanation: 'High arterial traffic zone' },
      ],
    },

    operations: {
      departmentName: incident.departmentId?.name || 'Municipal Works & Infrastructure Department',
      assignedToName: incident.assignedTo?.profile
        ? `${incident.assignedTo.profile.firstName} ${incident.assignedTo.profile.lastName || ''}`.trim()
        : 'Civic Rapid Response Crew',
      assignedToRole: incident.assignedTo?.role || 'Field Response Unit',
      slaDeadline: toIsoSafeOptional(incident.sla?.deadline),
      slaBreached: !!incident.sla?.breached,
      escalationLevel: incident.sla?.escalationLevel || 1,
    },

    reporter: {
      name: reporterName,
      email: reporterEmail,
      phone: reporterPhone,
      additionalMessage: additionalMessage,
      consentGiven: consentGiven,
    },

    evidence: evidenceList,

    resolution: incident.resolution && incident.resolution.resolvedAt
      ? {
          resolvedAt: toIsoSafe(incident.resolution.resolvedAt),
          resolvedByName: incident.resolution.resolvedBy?.profile?.firstName || 'Field Supervisor',
          resolutionNotes: incident.resolution.resolutionNotes,
          verifiedByHuman: !!incident.resolution.verifiedByHuman,
        }
      : undefined,
  };
}
