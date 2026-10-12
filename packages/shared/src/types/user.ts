// ============================================================
// User Types
// ============================================================

import type { Role } from '../constants/roles';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UserTrust {
  score: number;
  verifiedReports: number;
  falseReports: number;
  spamFlags: number;
  lastUpdated: string;
}

export interface UserSecurity {
  mfaEnabled: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockoutUntil?: string;
  lastPasswordChange: string;
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  language: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  profile: UserProfile;
  role: Role;
  permissions: string[];
  departmentId?: string;
  trust: UserTrust;
  security: UserSecurity;
  preferences: UserPreferences;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Minimal user info returned in lists and references */
export interface UserSummary {
  id: string;
  email: string;
  profile: Pick<UserProfile, 'firstName' | 'lastName' | 'avatarUrl'>;
  role: Role;
}

export interface DeviceInfo {
  userAgent: string;
  os: string;
  browser: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceName: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  ip: string;
  approximateLocation?: string;
  lastActiveAt: string;
  createdAt: string;
}
