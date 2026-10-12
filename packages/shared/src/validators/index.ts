// ============================================================
// Shared Zod Validators
// ============================================================
// These validators are used by BOTH frontend (form validation)
// and backend (request validation) to ensure consistency.
// ============================================================

import { z } from 'zod';
import { ALL_ROLES } from '../constants/roles';
import { ALL_INCIDENT_CATEGORIES, ALL_INCIDENT_PRIORITIES } from '../constants/incidents';

export const roleSchema = z.enum(ALL_ROLES as [string, ...string[]]);

// ── Common ────────────────────────────────────────────────

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const geoPointSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().min(100).max(50000).default(5000),
});

// ── Auth ──────────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').max(255).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: z.string().max(20).optional(),
  organizationSlug: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  organizationSlug: z.string().min(1).max(100),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  organizationSlug: z.string().min(1).max(100),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

// ── Incidents ─────────────────────────────────────────────

export const createIncidentSchema = z.object({
  category: z.enum(ALL_INCIDENT_CATEGORIES as [string, ...string[]]),
  subcategory: z.string().max(100).optional(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  priority: z.enum(ALL_INCIDENT_PRIORITIES as [string, ...string[]]).optional(),
  isEmergency: z.boolean().default(false),
  location: z.object({
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
    address: z.string().min(1).max(500),
  }),
  evidenceIds: z.array(objectIdSchema).max(10).optional(),
  reportingMode: z.enum(['standard', 'emergency', 'voice', 'quick']).default('standard'),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  priority: z.enum(ALL_INCIDENT_PRIORITIES as [string, ...string[]]).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const incidentFilterSchema = z.object({
  ...paginationSchema.shape,
  category: z.enum(ALL_INCIDENT_CATEGORIES as [string, ...string[]]).optional(),
  status: z.string().optional(),
  priority: z.enum(ALL_INCIDENT_PRIORITIES as [string, ...string[]]).optional(),
  departmentId: objectIdSchema.optional(),
  isEmergency: z.coerce.boolean().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ── Community Verification ────────────────────────────────

export const verificationVoteSchema = z.object({
  response: z.enum(['yes', 'no', 'unsure']),
  location: geoPointSchema,
});

// ── Organization ──────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(['municipality', 'campus', 'residential', 'industrial', 'smart_city']),
  settings: z.object({
    timezone: z.string().min(1),
    locale: z.string().min(2).max(10),
    defaultMapCenter: z.object({
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    defaultMapZoom: z.number().min(1).max(22),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type IncidentFilterInput = z.infer<typeof incidentFilterSchema>;
export type VerificationVoteInput = z.infer<typeof verificationVoteSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
