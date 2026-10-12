// ============================================================
// Evidence Types
// ============================================================

export type EvidenceType = 'image' | 'video' | 'audio' | 'document';
export type EvidencePhase = 'report' | 'before' | 'during' | 'after';

export interface EvidenceMetadata {
  capturedAt?: string;
  capturedLocation?: { type: 'Point'; coordinates: [number, number] };
  deviceInfo?: string;
}

export interface EvidenceAIAnalysis {
  labels: string[];
  confidence: number;
  detectedIssues: string[];
}

export interface Evidence {
  id: string;
  incidentId: string;
  organizationId: string;
  uploadedBy: string;
  type: EvidenceType;
  phase: EvidencePhase;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  metadata: EvidenceMetadata;
  aiAnalysis?: EvidenceAIAnalysis;
  isVerified: boolean;
  createdAt: string;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
  expiresAt: string;
}
