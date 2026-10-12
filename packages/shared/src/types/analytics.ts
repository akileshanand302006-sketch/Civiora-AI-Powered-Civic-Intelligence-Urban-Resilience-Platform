// ============================================================
// Analytics Types
// ============================================================

export interface AnalyticsDashboard {
  totalIncidents: number;
  resolvedIncidents: number;
  averageResolutionHours: number;
  activeZones: number;
  slaComplianceRate: number;
  incidentsByCategory: Record<string, number>;
  incidentsByPriority: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  trendData: TrendDataPoint[];
  topHotspots: HotspotInfo[];
}

export interface TrendDataPoint {
  date: string;
  reported: number;
  resolved: number;
  averageResponseMinutes: number;
}

export interface HotspotInfo {
  location: { lng: number; lat: number };
  radius: number;
  incidentCount: number;
  primaryCategory: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  totalAssigned: number;
  totalResolved: number;
  averageResolutionHours: number;
  slaComplianceRate: number;
  activeWorkers: number;
  workloadDistribution: Record<string, number>;
}

export interface PredictionInfo {
  id: string;
  type: 'hotspot' | 'recurrence' | 'deterioration' | 'cluster_emerging';
  location: { lng: number; lat: number };
  radius: number;
  category: string;
  riskType: string;
  timeWindow: { start: string; end: string };
  confidence: number;
  evidence: Array<{ factor: string; weight: number }>;
}
