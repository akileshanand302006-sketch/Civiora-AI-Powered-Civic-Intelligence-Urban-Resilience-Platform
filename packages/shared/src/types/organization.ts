// ============================================================
// Organization & Department Types
// ============================================================

export type OrganizationType = 'municipality' | 'campus' | 'residential' | 'industrial' | 'smart_city';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export interface OrganizationBranding {
  primaryColor: string;
  logoUrl: string;
  favicon: string;
}

export interface OrganizationSettings {
  timezone: string;
  locale: string;
  defaultMapCenter: { type: 'Point'; coordinates: [number, number] };
  defaultMapZoom: number;
  locationPrecisionPublic: number; // meters of fuzzing
  evidenceRetentionDays: number;
  autoEscalationEnabled: boolean;
}

export interface OrganizationSubscription {
  plan: SubscriptionPlan;
  maxUsers: number;
  maxDepartments: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  branding: OrganizationBranding;
  settings: OrganizationSettings;
  subscription: OrganizationSubscription;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string;
  categories: string[];
  managerId?: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
