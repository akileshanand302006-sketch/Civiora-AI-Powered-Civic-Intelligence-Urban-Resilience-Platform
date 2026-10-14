// ============================================================
// Civiora — Resolution Verification, Approval & PDF Dispatch Service
// Separation of duties, immutable resolution documents, Resend delivery,
// and tamper-evident event logging
// ============================================================

import { Types } from 'mongoose';
import crypto from 'crypto';
import { Resend } from 'resend';
import { Incident } from '../incidents/incident.model.js';
import { WorkSession } from './workSession.model.js';
import { ResolutionDocument, type IResolutionDocument } from '../reports/resolutionDocument.model.js';
import { generateResolutionPdf } from '../reports/pdfGenerator.service.js';
import { recordChainedIncidentEvent } from '../incidents/incidentEvent.model.js';
import { Notification } from '../notifications/notification.model.js';
import { DispatchRecord } from '../reports/dispatch.model.js';
import { User } from '../users/user.model.js';
import { Department } from '../organizations/department.model.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { emitToOrg } from '../../socket/socketServer.js';
import { SOCKET_EVENTS, INCIDENT_CATEGORY_LABELS } from '@civicpulse/shared';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { emitInngestEvent } from '../../inngest/index.js';
import { dispatchIncidentLifecycleNotification } from '../notifications/emailNotification.service.js';

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  if (env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_')) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Department Officer, Manager, or Admin approves completed work.
 * Enforces separation of duties (worker cannot approve own work).
 */
export async function approveResolution(params: {
  incidentIdStr: string;
  verifierIdStr: string;
  verifierRole: string;
  reviewNotes?: string;
}): Promise<{
  resolutionDocument: IResolutionDocument;
  incident: any;
  pdfBuffer: Buffer;
  emailDispatched: boolean;
}> {
  const { incidentIdStr, verifierIdStr, verifierRole, reviewNotes } = params;

  const incidentQuery = Types.ObjectId.isValid(incidentIdStr)
    ? { _id: new Types.ObjectId(incidentIdStr) }
    : { incidentNumber: incidentIdStr };

  const incident = await Incident.findOne(incidentQuery)
    .populate('reportedBy', 'email profile')
    .populate('assignedTo', 'email profile');

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  // Find associated WorkSession
  const workSession = await WorkSession.findOne({
    incidentId: incident._id,
  }).sort({ createdAt: -1 });

  if (!workSession) {
    throw new BadRequestError('Cannot approve resolution: No work session was found for this incident.');
  }

  // Separation of duties: Worker cannot approve their own work
  if (String(workSession.workerId) === verifierIdStr) {
    throw new ForbiddenError(
      'Accountability Policy Violation: The field worker who executed the repair cannot self-approve their resolution. An authorized Officer or Manager must verify.'
    );
  }

  const verifier = await User.findById(verifierIdStr);
  if (!verifier) {
    throw new NotFoundError('Verifier User');
  }

  const worker = await User.findById(workSession.workerId);
  const workerName = worker?.profile
    ? `${worker.profile.firstName} ${worker.profile.lastName}`.trim()
    : 'Assigned Field Worker';

  const verifierName = verifier.profile
    ? `${verifier.profile.firstName} ${verifier.profile.lastName}`.trim()
    : 'Department Authority';

  let departmentName = 'Municipal Operations';
  if (incident.departmentId) {
    const dept = await Department.findById(incident.departmentId);
    if (dept) departmentName = dept.name;
  }

  // Determine resolution document version
  const lastDoc = await ResolutionDocument.findOne({ incidentId: incident._id }).sort({ version: -1 });
  const version = lastDoc ? lastDoc.version + 1 : 1;
  const resolutionId = `RES-${incident.incidentNumber}-V${version}`;
  const filename = `Civiora_Resolution_${incident.incidentNumber}_v${version}.pdf`;

  const now = new Date();

  // Generate Preliminary SHA-256 Hash placeholder
  const initialHash = crypto
    .createHash('sha256')
    .update(`${resolutionId}|${incident.incidentNumber}|${now.toISOString()}|${verifierIdStr}`)
    .digest('hex');

  const categoryLabel = (INCIDENT_CATEGORY_LABELS as Record<string, string>)[incident.category] || incident.category;

  // Generate Authoritative Final Resolution PDF Buffer
  const pdfBuffer = await generateResolutionPdf({
    incidentNumber: incident.incidentNumber,
    title: incident.title,
    categoryLabel,
    locationAddress: incident.location.address,
    coordinates: incident.location.coordinates,
    submittedAt: incident.createdAt,
    resolvedAt: now,
    startedAt: workSession.startedAt,
    completedAt: workSession.completedAt || now,
    elapsedSeconds: workSession.elapsedSeconds,
    activeWorkSeconds: workSession.activeWorkSeconds,
    workerName,
    verifierName,
    verifierRole: verifierRole.replace('_', ' ').toUpperCase(),
    departmentName,
    completionSummary: workSession.completionSummary || 'Civic infrastructure repair verified to operational standards.',
    inspectionNotes: workSession.inspectionNotes,
    materialsUsed: workSession.materialsUsed,
    resolutionId,
    version,
    contentHash: initialHash,
  });

  // Calculate strict SHA-256 digest of the actual generated PDF
  const finalContentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Persist ResolutionDocument
  const resolutionDocument = await ResolutionDocument.create({
    resolutionId,
    incidentId: incident._id,
    incidentNumber: incident.incidentNumber,
    organizationId: incident.organizationId,
    version,
    filename,
    contentHash: finalContentHash,
    pdfBufferBase64: pdfBuffer.toString('base64'),
    pdfSizeBytes: pdfBuffer.length,
    workSessionId: workSession._id,
    approvedBy: verifier._id,
    verifierName,
    workerName,
    departmentName,
    startedAt: workSession.startedAt,
    completedAt: workSession.completedAt || now,
    totalDurationSeconds: workSession.elapsedSeconds,
    activeDurationSeconds: workSession.activeWorkSeconds,
    completionSummary: workSession.completionSummary || 'Repairs completed and inspected.',
    inspectionNotes: workSession.inspectionNotes,
    resolutionCategory: workSession.resolutionCategory || incident.category,
    status: 'approved',
    generatedAt: now,
  });

  // Transition Incident to RESOLVED
  const previousStatus = incident.status;
  incident.status = 'resolved' as any;
  incident.resolutionDocumentId = resolutionDocument._id;
  incident.resolution = {
    resolvedAt: now,
    resolvedBy: verifier._id,
    resolutionNotes: reviewNotes || 'Work inspected, approved and verified by department command.',
    verifiedByHuman: true,
  };
  incident.timeline.push({
    action: 'RESOLUTION_APPROVED',
    performedBy: verifier._id,
    timestamp: now,
    details: {
      resolutionId,
      version,
      contentHash: finalContentHash,
      notes: reviewNotes,
    },
  });
  await incident.save();

  // Record Chained Audit Event with SHA-256 link
  await recordChainedIncidentEvent({
    incidentId: incident._id,
    organizationId: incident.organizationId,
    actorId: verifier._id,
    action: 'RESOLUTION_APPROVED',
    eventType: 'RESOLUTION_APPROVED',
    fromStatus: previousStatus,
    toStatus: 'resolved',
    notes: `Resolution approved by ${verifierName}. Version: ${version}, SHA-256: ${finalContentHash.substring(0, 16)}...`,
    changeSummary: reviewNotes || 'Resolution verified and closed',
    correlationId: resolutionId,
  });

  // In-App Notifications
  // 1. Notify Citizen
  if (incident.reportedBy) {
    const reporterId = (incident.reportedBy as any)._id || incident.reportedBy;
    await Notification.create({
      userId: reporterId,
      organizationId: incident.organizationId,
      type: 'INCIDENT_RESOLVED',
      title: '🎉 Hazard Resolved',
      message: `Your reported incident #${incident.incidentNumber} (${incident.title}) has been successfully resolved and verified.`,
      data: {
        incidentId: incident._id,
        incidentNumber: incident.incidentNumber,
        resolutionId,
      },
    });
  }

  // 2. Notify Field Worker
  if (workSession.workerId) {
    await Notification.create({
      userId: workSession.workerId,
      organizationId: incident.organizationId,
      type: 'RESOLUTION_APPROVED',
      title: '✓ Work Order Approved',
      message: `Your repair work on #${incident.incidentNumber} was verified and approved by ${verifierName}.`,
      data: {
        incidentId: incident._id,
        incidentNumber: incident.incidentNumber,
        resolutionId,
      },
    });
  }

  // 3. Dispatch Resolution Email via Resend with attached PDF
  let emailDispatched = false;
  try {
    const resend = getResendClient();
    const recipientEmail =
      (incident.reportedBy as any)?.email ||
      env.MUNICIPAL_RECEIVER_EMAIL ||
      'akileshanand302006@gmail.com';

    if (resend) {
      const idempotencyKey = `res-email-${resolutionId}-${Date.now()}`;
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B1321; color: #F8FAFC; padding: 24px; border-radius: 8px;">
          <h2 style="color: #10B981; margin-top: 0;">✓ CIVIORA RESOLUTION DOSSIER</h2>
          <p style="font-size: 15px; color: #E2E8F0;">
            The civic hazard reported under reference <strong>#${incident.incidentNumber}</strong> has been officially inspected, resolved, and verified by municipal authorities.
          </p>
          <div style="background-color: #10213A; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #10B981;">
            <p style="margin: 4px 0;"><strong>Category:</strong> ${categoryLabel}</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${incident.location.address}</p>
            <p style="margin: 4px 0;"><strong>Verified By:</strong> ${verifierName} (${verifierRole})</p>
            <p style="margin: 4px 0;"><strong>Active Work Duration:</strong> ${Math.round(workSession.activeWorkSeconds / 60)} minutes</p>
            <p style="margin: 4px 0;"><strong>Summary:</strong> ${workSession.completionSummary || 'Repairs completed to standard'}</p>
          </div>
          <p style="font-size: 13px; color: #94A3B8;">
            An official, tamper-evident PDF dossier (<em>${filename}</em>) has been attached to this email. You may also view and track the real-time resilience twin at <a href="${env.FRONTEND_URL}" style="color: #64D2FF;">Civiora Municipal Portal</a>.
          </p>
          <p style="font-size: 11px; color: #64748B; margin-top: 24px;">
            Document Integrity SHA-256: <code>${finalContentHash}</code>
          </p>
        </div>
      `;

      const sendResponse = await resend.emails.send({
        from: `Civiora Municipal Command <${env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: [recipientEmail],
        subject: `[RESOLVED] Civic Hazard Dossier #${incident.incidentNumber}: ${incident.title}`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: pdfBuffer,
          },
        ],
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (sendResponse.data?.id) {
        emailDispatched = true;
        await DispatchRecord.create({
          incidentId: incident._id,
          incidentNumber: incident.incidentNumber,
          recipientEmail,
          reporterName: verifierName,
          reporterEmail: recipientEmail,
          additionalMessage: `Resolution approved by ${verifierName}`,
          idempotencyKey,
          status: 'sent',
          provider: 'resend',
          providerMessageId: sendResponse.data.id,
          pdfSizeBytes: pdfBuffer.length,
          dispatchedAt: now,
          completedAt: now,
        });

        logger.info(
          { incidentNumber: incident.incidentNumber, messageId: sendResponse.data.id },
          'Resolution email and PDF attached successfully dispatched via Resend'
        );
      }
    }
  } catch (emailErr: any) {
    logger.warn({ err: emailErr.message }, 'Resolution email delivery encountered warning, incident remains resolved');
  }

  emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, incident.toJSON());

  // Trigger automated multi-role resolution notifications with PDF attachment
  dispatchIncidentLifecycleNotification({
    incident,
    eventType: 'RESOLUTION_APPROVED',
    pdfBuffer,
    pdfFilename: filename,
    notes: workSession.completionSummary || reviewNotes,
    actorName: verifierName,
  }).catch((emailErr) => {
    logger.warn({ err: emailErr.message }, '[approveResolution] Multi-role resolution email dispatch notice');
  });

  // Trigger Inngest role-based workflow orchestration
  emitInngestEvent('incident/resolved', {
    incidentId: incident._id.toString(),
    incidentNumber: incident.incidentNumber,
    verifierName,
    verifierNotes: reviewNotes || 'Repairs completed and approved to municipal standard',
    resolutionId: resolutionDocument.resolutionId,
    version: resolutionDocument.version,
  });

  return {
    resolutionDocument,
    incident,
    pdfBuffer,
    emailDispatched,
  };
}

/**
 * Rejects resolution or requests additional field evidence
 */
export async function rejectResolution(params: {
  incidentIdStr: string;
  verifierIdStr: string;
  reason: string;
}): Promise<any> {
  const { incidentIdStr, verifierIdStr, reason } = params;

  if (!reason || reason.trim().length === 0) {
    throw new BadRequestError('A specific reason is required to reject or request evidence');
  }

  const incidentQuery = Types.ObjectId.isValid(incidentIdStr)
    ? { _id: new Types.ObjectId(incidentIdStr) }
    : { incidentNumber: incidentIdStr };

  const incident = await Incident.findOne(incidentQuery);
  if (!incident) {
    throw new NotFoundError('Incident');
  }

  const previousStatus = incident.status;
  incident.status = 'in_progress' as any;
  incident.timeline.push({
    action: 'RESOLUTION_REJECTED',
    performedBy: new Types.ObjectId(verifierIdStr),
    timestamp: new Date(),
    details: { reason },
  });
  await incident.save();

  // Re-activate WorkSession
  const workSession = await WorkSession.findOne({ incidentId: incident._id }).sort({ createdAt: -1 });
  if (workSession) {
    workSession.sessionStatus = 'active';
    await workSession.save();

    // Notify field worker
    await Notification.create({
      userId: workSession.workerId,
      organizationId: incident.organizationId,
      type: 'RESOLUTION_REWORK_REQUESTED',
      title: 'Action Required: Rework Requested',
      message: `Your resolution for #${incident.incidentNumber} requires revision. Officer feedback: ${reason}`,
      data: { incidentId: incident._id, incidentNumber: incident.incidentNumber },
    });
  }

  await recordChainedIncidentEvent({
    incidentId: incident._id,
    organizationId: incident.organizationId,
    actorId: new Types.ObjectId(verifierIdStr),
    action: 'RESOLUTION_REJECTED',
    eventType: 'RESOLUTION_REJECTED',
    fromStatus: previousStatus,
    toStatus: 'in_progress',
    notes: `Resolution rejected: ${reason}`,
    reason,
  });

  emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, incident.toJSON());

  return incident;
}
