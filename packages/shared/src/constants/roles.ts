// ============================================================
// Role Definitions
// ============================================================

export const ROLES = {
  CITIZEN: 'citizen',
  FIELD_WORKER: 'field_worker',
  OFFICER: 'officer',
  MANAGER: 'manager',
  EMERGENCY_OPERATOR: 'emergency_operator',
  MODERATOR: 'moderator',
  TENANT_ADMIN: 'tenant_admin',
  SYSTEM_ADMIN: 'system_admin',
  SECURITY_AUDITOR: 'security_auditor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  citizen: 'Citizen',
  field_worker: 'Field Worker',
  officer: 'Department Officer',
  manager: 'Department Manager',
  emergency_operator: 'Emergency Operator',
  moderator: 'Moderator',
  tenant_admin: 'Tenant Administrator',
  system_admin: 'System Administrator',
  security_auditor: 'Security Auditor',
};

export const ROLE_ICONS: Record<Role, string> = {
  citizen: 'bi-person',
  field_worker: 'bi-tools',
  officer: 'bi-building',
  manager: 'bi-graph-up',
  emergency_operator: 'bi-exclamation-triangle',
  moderator: 'bi-shield-check',
  tenant_admin: 'bi-gear',
  system_admin: 'bi-terminal',
  security_auditor: 'bi-lock',
};

/** Hierarchy level — higher number = more authority */
export const ROLE_HIERARCHY: Record<Role, number> = {
  citizen: 0,
  field_worker: 1,
  officer: 2,
  manager: 3,
  emergency_operator: 3,
  moderator: 3,
  tenant_admin: 4,
  system_admin: 5,
  security_auditor: 4,
};

/** Roles that can self-register */
export const SELF_REGISTERABLE_ROLES: Role[] = [
  ROLES.CITIZEN,
];

/** Roles that require admin provisioning */
export const ADMIN_PROVISIONED_ROLES: Role[] = [
  ROLES.FIELD_WORKER,
  ROLES.OFFICER,
  ROLES.MANAGER,
  ROLES.EMERGENCY_OPERATOR,
  ROLES.MODERATOR,
  ROLES.TENANT_ADMIN,
  ROLES.SYSTEM_ADMIN,
  ROLES.SECURITY_AUDITOR,
];

export const ALL_ROLES: Role[] = Object.values(ROLES);
