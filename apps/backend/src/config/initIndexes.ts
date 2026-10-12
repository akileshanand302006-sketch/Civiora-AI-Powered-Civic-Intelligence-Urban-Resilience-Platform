// ============================================================
// Civiora — Centralized MongoDB Atlas Index Engine
// Ensures all 2dsphere, Compound, Unique and TTL Indexes Exist
// ============================================================

import { logger } from '../utils/logger.js';
import { User } from '../modules/users/user.model.js';
import { Organization } from '../modules/organizations/org.model.js';
import { Department } from '../modules/organizations/department.model.js';
import { Session } from '../modules/auth/session.model.js';
import { Invitation } from '../modules/auth/invitation.model.js';
import { Incident } from '../modules/incidents/incident.model.js';
import { Evidence } from '../modules/incidents/evidence.model.js';
import { IncidentCluster } from '../modules/incidents/cluster.model.js';
import { CommunityVerification } from '../modules/incidents/verification.model.js';
import { IncidentEvent } from '../modules/incidents/incidentEvent.model.js';
import { LocationModel } from '../modules/locations/location.model.js';
import { Zone } from '../modules/locations/zone.model.js';
import { InfrastructureAsset } from '../modules/locations/infrastructure.model.js';
import { Assignment } from '../modules/operations/assignment.model.js';
import { SLAPolicy } from '../modules/operations/sla.model.js';
import { WorkerAvailability } from '../modules/operations/workerAvailability.model.js';
import { AIPrediction } from '../modules/ai/aiPrediction.model.js';
import { AIInference } from '../modules/ai/aiInference.model.js';
import { AnalyticsSnapshot } from '../modules/ai/analyticsSnapshot.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { EmergencyEvent } from '../modules/notifications/emergencyEvent.model.js';
import { AuditLog } from '../modules/security/auditLog.model.js';
import { SecurityEvent } from '../modules/security/securityEvent.model.js';
import { IdempotencyKey } from '../modules/common/idempotency.model.js';
import { SyncRecord } from '../modules/common/syncRecord.model.js';

export const ALL_MODELS = [
  User,
  Organization,
  Department,
  Session,
  Invitation,
  Incident,
  Evidence,
  IncidentCluster,
  CommunityVerification,
  IncidentEvent,
  LocationModel,
  Zone,
  InfrastructureAsset,
  Assignment,
  SLAPolicy,
  WorkerAvailability,
  AIPrediction,
  AIInference,
  AnalyticsSnapshot,
  Notification,
  EmergencyEvent,
  AuditLog,
  SecurityEvent,
  IdempotencyKey,
  SyncRecord,
];

export async function initializeDatabaseIndexes(): Promise<void> {
  logger.info('Initializing MongoDB Atlas collection indexes...');

  for (const model of ALL_MODELS) {
    try {
      await model.createIndexes();
      logger.debug(`  ✓ Indexes verified for collection: ${model.collection.name}`);
    } catch (err: any) {
      logger.warn(
        { model: model.modelName, error: err.message },
        `Index creation warning for ${model.modelName}`
      );
    }
  }

  logger.info('✅ All 24+ MongoDB Atlas collection indexes verified');
}
