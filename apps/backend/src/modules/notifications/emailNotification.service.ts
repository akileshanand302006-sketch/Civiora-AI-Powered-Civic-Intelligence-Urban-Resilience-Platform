// ============================================================
// Civiora — Role-Specific Automated Email Notification Service
// Enterprise Resend API Integration • Multi-Role Delivery •
// Recipient Deduplication • PDF Dossier Attachments • Durable Records
// ============================================================

import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  EmailDeliveryRecord,
  type EmailEventType,
  type EmailDeliveryStatus,
} from './emailDelivery.model.js';
import { buildIncidentReportDTO } from '../reports/report.dto.js';
import { generateIncidentPdf } from '../reports/pdfGenerator.service.js';
import { INCIDENT_CATEGORY_LABELS, type IncidentCategory } from '@civicpulse/shared';

// Canonical intended role notification mailboxes
export const ROLE_MAILBOXES = {
  SYSTEM_ADMIN: 'akileshanand302006@gmail.com',
  DEPARTMENT_MANAGER: 'doctordoom3056@gmail.com',
  FIELD_WORKER: 'steverogers302006@gmail.com',
} as const;

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (apiKey && apiKey.startsWith('re_')) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface DispatchNotificationOptions {
  incident: any;
  eventType: EmailEventType;
  customRecipients?: string[];
  pdfBuffer?: Buffer;
  pdfFilename?: string;
  notes?: string;
  actorName?: string;
}

/**
 * Dispatches automated notifications for incident lifecycle events.
 * Deduplicates recipients, generates durable audit records, and attaches
 * vector PDF dossiers when available. Never throws or rolls back transactions.
 */
export async function dispatchIncidentLifecycleNotification(
  options: DispatchNotificationOptions
): Promise<{ dispatched: number; failed: number; skipped: number }> {
  const { incident, eventType, customRecipients = [], notes, actorName } = options;

  let dispatched = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // 1. Gather all potential recipients based on eventType
    const recipientList: Array<{ email: string; role: string }> = [];

    switch (eventType) {
      case 'INCIDENT_REPORTED':
        recipientList.push(
          { email: ROLE_MAILBOXES.FIELD_WORKER, role: 'field_worker' },
          { email: ROLE_MAILBOXES.SYSTEM_ADMIN, role: 'system_admin' },
          { email: ROLE_MAILBOXES.DEPARTMENT_MANAGER, role: 'department_manager' }
        );
        if (incident.departmentContactEmail) {
          recipientList.push({ email: incident.departmentContactEmail, role: 'department' });
        }
        break;

      case 'INCIDENT_ASSIGNED':
        recipientList.push(
          { email: ROLE_MAILBOXES.FIELD_WORKER, role: 'field_worker' },
          { email: ROLE_MAILBOXES.DEPARTMENT_MANAGER, role: 'department_manager' }
        );
        if (incident.assignedWorkerEmail) {
          recipientList.push({ email: incident.assignedWorkerEmail, role: 'assigned_worker' });
        }
        break;

      case 'WORK_STARTED':
        recipientList.push(
          { email: ROLE_MAILBOXES.DEPARTMENT_MANAGER, role: 'department_manager' },
          { email: ROLE_MAILBOXES.SYSTEM_ADMIN, role: 'system_admin' }
        );
        break;

      case 'WORK_COMPLETED':
        recipientList.push(
          { email: ROLE_MAILBOXES.DEPARTMENT_MANAGER, role: 'department_manager' },
          { email: ROLE_MAILBOXES.SYSTEM_ADMIN, role: 'system_admin' }
        );
        break;

      case 'RESOLUTION_APPROVED':
        recipientList.push(
          { email: ROLE_MAILBOXES.FIELD_WORKER, role: 'field_worker' },
          { email: ROLE_MAILBOXES.DEPARTMENT_MANAGER, role: 'department_manager' },
          { email: ROLE_MAILBOXES.SYSTEM_ADMIN, role: 'system_admin' }
        );
        const citizenEmail = (incident.reportedBy as any)?.email;
        if (citizenEmail) {
          recipientList.push({ email: citizenEmail, role: 'citizen' });
        }
        break;
    }

    // Add any explicit caller-supplied recipients
    for (const c of customRecipients) {
      if (c) recipientList.push({ email: c, role: 'recipient' });
    }

    // 2. Strict Recipient Deduplication (Case-insensitive unique emails)
    const seenEmails = new Set<string>();
    const deduplicatedRecipients: Array<{ email: string; role: string }> = [];

    for (const item of recipientList) {
      const normalized = (item.email || '').toLowerCase().trim();
      if (normalized && !seenEmails.has(normalized)) {
        seenEmails.add(normalized);
        deduplicatedRecipients.push({ email: normalized, role: item.role });
      }
    }

    if (deduplicatedRecipients.length === 0) {
      return { dispatched: 0, failed: 0, skipped: 0 };
    }

    // 3. Prepare or generate official PDF dossier if applicable
    let pdfAttachment: { content: Buffer; filename: string } | null = null;
    if (options.pdfBuffer && options.pdfFilename) {
      pdfAttachment = { content: options.pdfBuffer, filename: options.pdfFilename };
    } else if (eventType === 'INCIDENT_REPORTED') {
      try {
        const dto = buildIncidentReportDTO(incident, { consent: true });
        const buffer = await generateIncidentPdf(dto);
        if (buffer && buffer.length > 0) {
          pdfAttachment = {
            content: buffer,
            filename: `Civiora-Report-${incident.incidentNumber}.pdf`,
          };
        }
      } catch (pdfErr: any) {
        logger.warn(
          { err: pdfErr.message, incidentNumber: incident.incidentNumber },
          '[EmailNotification] PDF generation failed, proceeding with email delivery without attachment'
        );
      }
    }

    // 4. Build Subject and Template Content
    const catLabel =
      INCIDENT_CATEGORY_LABELS[incident.category as IncidentCategory] ||
      incident.category ||
      'Civic Hazard';
    const address = incident.location?.address || 'Metropolis Municipality';
    const coords = incident.location?.coordinates
      ? `[${incident.location.coordinates[1].toFixed(5)}, ${incident.location.coordinates[0].toFixed(5)}]`
      : 'N/A';
    const priority = (incident.priority || 'MEDIUM').toUpperCase();
    const portalUrl = env.FRONTEND_URL || 'https://civioraai.vercel.app';

    let subject = `[CIVIORA] Alert: Hazard #${incident.incidentNumber} — ${catLabel}`;
    let bannerTitle = 'NEW CIVIC HAZARD REPORT';
    let bannerColor = '#0A84FF';
    let roleNotice =
      'This is an authoritative notification of a new citizen report logged in Civiora. (Unassigned hazard notification — not a work order).';

    if (eventType === 'INCIDENT_ASSIGNED') {
      subject = `[CIVIORA] Work Assignment: Hazard #${incident.incidentNumber} — ${catLabel}`;
      bannerTitle = 'FIELD WORK ORDER ASSIGNMENT';
      bannerColor = '#FF9F0A';
      roleNotice = 'You have been assigned to inspect and remediate this civic infrastructure hazard.';
    } else if (eventType === 'WORK_STARTED') {
      subject = `[CIVIORA] Field Work Started: Hazard #${incident.incidentNumber}`;
      bannerTitle = 'REPAIR SESSION IN PROGRESS';
      bannerColor = '#64D2FF';
      roleNotice = 'A certified field worker has commenced on-site repair operations.';
    } else if (eventType === 'WORK_COMPLETED') {
      subject = `[CIVIORA] Pending Verification: Hazard #${incident.incidentNumber} Repairs Completed`;
      bannerTitle = 'WORK COMPLETED — AWAITING VERIFICATION';
      bannerColor = '#BF5AF2';
      roleNotice = 'Field operations are complete. Photographic evidence is ready for managerial verification.';
    } else if (eventType === 'RESOLUTION_APPROVED') {
      subject = `[CIVIORA] RESOLVED: Hazard #${incident.incidentNumber} Verified & Closed`;
      bannerTitle = 'CIVIC HAZARD OFFICIALLY RESOLVED';
      bannerColor = '#30D158';
      roleNotice = 'The hazard has been resolved, inspected, and verified by municipal authority.';
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070D18; color: #F1F5F9; padding: 32px 20px; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: #0F172A; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, ${bannerColor}22 0%, #0F172A 100%); border-bottom: 2px solid ${bannerColor}; padding: 24px;">
            <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${bannerColor}; font-weight: 700; margin-bottom: 6px;">
              Civiora AI-Powered Civic Intelligence
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF;">
              ${bannerTitle}
            </h1>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">
              Reference: <strong style="color: #F8FAFC;">#${incident.incidentNumber}</strong>
            </div>
          </div>

          <!-- Body Content -->
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #CBD5E1; margin-top: 0;">
              ${roleNotice}
            </p>

            <!-- Metadata Matrix -->
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748B; width: 35%;">Category</td>
                  <td style="padding: 6px 0; color: #F8FAFC; font-weight: 600;">${catLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Priority / Severity</td>
                  <td style="padding: 6px 0; color: ${priority === 'CRITICAL' ? '#FF453A' : priority === 'HIGH' ? '#FF9F0A' : '#30D158'}; font-weight: 600;">
                    ${priority} ${incident.isEmergency ? '🚨 (EMERGENCY FLAG)' : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Title</td>
                  <td style="padding: 6px 0; color: #F8FAFC;">${incident.title || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Location</td>
                  <td style="padding: 6px 0; color: #F8FAFC;">${address}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">GPS Coordinates</td>
                  <td style="padding: 6px 0; color: #94A3B8; font-family: monospace;">${coords}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Recorded Timestamp</td>
                  <td style="padding: 6px 0; color: #F8FAFC;">${new Date().toUTCString()}</td>
                </tr>
                ${actorName ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Action By</td>
                  <td style="padding: 6px 0; color: #F8FAFC;">${actorName}</td>
                </tr>` : ''}
              </table>
            </div>

            ${incident.description ? `
            <div style="margin: 16px 0;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 1px; margin-bottom: 6px;">
                Description
              </div>
              <div style="font-size: 13px; color: #E2E8F0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; border-left: 3px solid ${bannerColor};">
                ${incident.description}
              </div>
            </div>` : ''}

            ${notes ? `
            <div style="margin: 16px 0;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 1px; margin-bottom: 6px;">
                Operational Notes
              </div>
              <div style="font-size: 13px; color: #E2E8F0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px;">
                ${notes}
              </div>
            </div>` : ''}

            <!-- CTA Button -->
            <div style="margin-top: 28px; text-align: center;">
              <a href="${portalUrl}/dashboard" style="display: inline-block; background: ${bannerColor}; color: #FFFFFF; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px ${bannerColor}44;">
                Access Secure Incident Portal →
              </a>
            </div>

            ${pdfAttachment ? `
            <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 16px;">
              📎 Official vector report attachment (<strong>${pdfAttachment.filename}</strong>) is included with this transmission.
            </p>` : ''}
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 16px 24px; font-size: 11px; color: #64748B; text-align: center; background: rgba(0,0,0,0.2);">
            Civiora Smart Municipality Command &copy; 2026 • Metropolis Core Resilience
          </div>
        </div>
      </div>
    `;

    // 5. Send to each deduplicated recipient with idempotency and audit logs
    const resend = getResendClient();
    const isLiveDelivery = env.EMAIL_DELIVERY_ENABLED && !!resend;

    for (const recipient of deduplicatedRecipients) {
      // Stable idempotency key: resend-{incidentNumber}-{eventType}-{recipientHash}
      const safeRecipient = recipient.email.replace(/[^a-z0-9]/gi, '_');
      const idempotencyKey = `resend-${incident.incidentNumber}-${eventType}-${safeRecipient}`;

      // Check if already dispatched
      const existing = await EmailDeliveryRecord.findOne({ idempotencyKey });
      if (existing && ['accepted', 'delivered'].includes(existing.status)) {
        logger.info(
          { idempotencyKey, recipient: recipient.email },
          '[EmailNotification] Skipped duplicate delivery (already sent)'
        );
        skipped++;
        continue;
      }

      // Upsert record in 'sending' state
      const deliveryRecord = await EmailDeliveryRecord.findOneAndUpdate(
        { idempotencyKey },
        {
          $set: {
            incidentId: incident._id,
            incidentNumber: incident.incidentNumber,
            eventType,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
            subject,
            template: 'role_incident_lifecycle',
            status: 'sending' as EmailDeliveryStatus,
            provider: isLiveDelivery ? 'resend' : 'mock',
            hasAttachment: !!pdfAttachment,
            attachmentFilename: pdfAttachment?.filename,
            lastAttemptAt: new Date(),
          },
          $inc: { attemptCount: 1 },
        },
        { upsert: true, new: true }
      );

      if (isLiveDelivery && resend) {
        try {
          const fromAddress = env.RESEND_FROM_EMAIL.includes('<')
            ? env.RESEND_FROM_EMAIL
            : `Civiora Municipal Command <${env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

          const emailPayload: any = {
            from: fromAddress,
            to: [recipient.email],
            subject,
            html: htmlBody,
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          };

          if (pdfAttachment) {
            emailPayload.attachments = [
              {
                filename: pdfAttachment.filename,
                content: pdfAttachment.content,
              },
            ];
          }

          const sendResult = await resend.emails.send(emailPayload);

          if (sendResult.error) {
            deliveryRecord.status = 'failed';
            deliveryRecord.lastError = sendResult.error.message || 'Resend rejected transmission';
            await deliveryRecord.save();
            logger.warn(
              { recipient: recipient.email, error: sendResult.error },
              '[EmailNotification] Resend rejected dispatch'
            );
            failed++;
          } else {
            deliveryRecord.status = 'accepted';
            deliveryRecord.providerMessageId = sendResult.data?.id;
            await deliveryRecord.save();
            logger.info(
              { recipient: recipient.email, messageId: sendResult.data?.id },
              '[EmailNotification] Email successfully dispatched via Resend'
            );
            dispatched++;
          }
        } catch (sendErr: any) {
          deliveryRecord.status = 'failed';
          deliveryRecord.lastError = sendErr.message || 'Unknown network error';
          await deliveryRecord.save();
          logger.error(
            { recipient: recipient.email, err: sendErr.message },
            '[EmailNotification] Resend API threw error during dispatch'
          );
          failed++;
        }
      } else {
        // Mock provider simulation (dev mode / API key omitted)
        deliveryRecord.status = 'accepted';
        deliveryRecord.providerMessageId = `mock-resend-${Math.random().toString(36).substring(2, 10)}`;
        await deliveryRecord.save();
        logger.info(
          { recipient: recipient.email, eventType },
          '[EmailNotification] Simulated delivery recorded (EMAIL_DELIVERY_ENABLED=false or mock)'
        );
        dispatched++;
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, '[EmailNotification] Lifecycle notification handler failed safely');
  }

  return { dispatched, failed, skipped };
}
