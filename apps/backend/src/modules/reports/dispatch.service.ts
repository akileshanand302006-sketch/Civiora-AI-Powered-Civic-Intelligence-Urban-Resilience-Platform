// ============================================================
// Civiora Municipal Dispatch & Resend Email Delivery Service
// One-Click Incident PDF Generation + Resend API Integration
// ============================================================

import { Resend } from 'resend';
import { nanoid } from 'nanoid';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { generateIncidentPdf } from './pdfGenerator.service.js';
import { DispatchRecord } from './dispatch.model.js';
import type { IncidentReportDTO } from './report.dto.js';

export interface DispatchResult {
  success: boolean;
  incidentNumber: string;
  recipientEmail: string;
  status: 'sent' | 'failed' | 'simulated';
  providerMessageId?: string;
  pdfSizeBytes: number;
  message: string;
  dispatchedAt: string;
  error?: string;
}

/**
 * Escapes unsafe HTML characters to prevent injection in email clients.
 */
function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds the professional responsive HTML email template for municipal authorities.
 */
function buildMunicipalEmailHtml(report: IncidentReportDTO): string {
  const portalUrl = `${env.FRONTEND_URL}/dashboard`;
  const severityBadgeColor =
    report.risk.level === 'critical' || report.isEmergency
      ? '#DC2626'
      : report.risk.level === 'high'
      ? '#D97706'
      : '#16A34A';

  const reporterDetailsHtml = report.reporter.consentGiven
    ? `
      <div style="font-size: 13px; color: #E2E8F0; margin-bottom: 4px;">
        <strong>${escapeHtml(report.reporter.name || 'Citizen Reporter')}</strong> • ${escapeHtml(report.reporter.email || 'Email not provided')} ${report.reporter.phone ? `• ${escapeHtml(report.reporter.phone)}` : ''}
      </div>
      <div style="font-size: 11px; color: #30D158; margin-top: 4px;">
        ✓ Citizen Consent Granted to share contact for official municipal follow-up.
      </div>
    `
    : `
      <div style="font-size: 13px; color: #94A3B8; font-style: italic; margin-bottom: 4px;">
        Anonymous / Identity &amp; Contact Withheld by Citizen Request
      </div>
      <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
        The reporting citizen has withheld personal contact information. Triage and inspect on-site.
      </div>
    `;

  const aiSuggestionHtml =
    report.aiFindings?.suggestedCategory || report.aiFindings?.confidence
      ? `
        <div style="background-color: rgba(100, 210, 255, 0.08); border: 1px solid rgba(100, 210, 255, 0.25); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #64D2FF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            🤖 AI-ASSISTED TRIAGE SUGGESTION
          </div>
          <div style="font-size: 12px; color: #E2E8F0;">
            Suggested Category: <strong>${escapeHtml(report.aiFindings.suggestedCategory || report.categoryLabel)}</strong>
            ${report.aiFindings.confidence !== undefined ? ` • Confidence: <strong>${Math.round(report.aiFindings.confidence * 100)}%</strong>` : ''}
            ${report.aiFindings.detectedObjects?.length ? ` • Detected: <em>${escapeHtml(report.aiFindings.detectedObjects.join(', '))}</em>` : ''}
          </div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
            <em>Note: AI predictions are decision-support suggestions for rapid field triage and do not replace officer discretion.</em>
          </div>
        </div>
      `
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Civiora Incident Report - ${escapeHtml(report.incidentNumber)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050A14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050A14; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #0B1321; border-radius: 16px; border: 1px solid rgba(159, 201, 255, 0.2); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Top Header Brand -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0B1321 0%, #10213A 100%); border-bottom: 1px solid rgba(159, 201, 255, 0.15);">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; line-height: 1;">CIVIORA</div>
                    <div style="font-size: 11px; color: #9FC9FF; letter-spacing: 0.5px; margin-top: 4px;">AI-POWERED CIVIC INTELLIGENCE PLATFORM</div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background-color: rgba(82, 127, 199, 0.25); border: 1px solid rgba(159, 201, 255, 0.35); color: #64D2FF; font-size: 11px; font-weight: 700;">
                      MUNICIPAL ALERT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Incident Reference Alert Strip -->
          <tr>
            <td style="padding: 16px 32px; background-color: #0E1A2E; border-bottom: 1px solid rgba(159, 201, 255, 0.1);">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 12px; color: #94A3B8; text-transform: uppercase; font-family: monospace;">INCIDENT REF:</span>
                    <strong style="font-size: 13px; color: #64D2FF; margin-left: 6px; font-family: monospace;">${escapeHtml(report.incidentNumber)}</strong>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: ${severityBadgeColor}; color: #FFFFFF; font-size: 11px; font-weight: 700;">
                      ${report.priority.toUpperCase()} PRIORITY (${report.risk.score}/100)
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 28px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                ${escapeHtml(report.title)}
              </h2>
              
              <div style="margin-bottom: 16px; font-size: 12px; color: #94A3B8;">
                Category: <strong style="color: #9FC9FF;">${escapeHtml(report.categoryLabel)}</strong> • Status: <strong style="color: #F8FAFC;">${escapeHtml(report.statusLabel)}</strong> • Submitted: <strong>${new Date(report.createdAt).toLocaleString()}</strong>
              </div>

              <!-- AI Suggestion Box (when available) -->
              ${aiSuggestionHtml}

              <!-- Incident Description Box -->
              <div style="background-color: #121E33; border: 1px solid rgba(159, 201, 255, 0.15); border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; color: #E2E8F0;">
                ${escapeHtml(report.description)}
              </div>

              <!-- Location & Coordinates Grid -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #0E1A2E; border-radius: 10px; border: 1px solid rgba(159, 201, 255, 0.12); padding: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #9FC9FF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      📍 INCIDENT LOCATION &amp; JURISDICTION
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #FFFFFF; margin-bottom: 6px;">
                      ${escapeHtml(report.location.address || 'Address not specified')}
                    </div>
                    <div style="font-size: 12px; color: #94A3B8; font-family: monospace; margin-bottom: 8px;">
                      COORDS: ${report.location.latitude.toFixed(5)}, ${report.location.longitude.toFixed(5)}
                    </div>
                    <div>
                      <a href="${report.location.googleMapsUrl}" target="_blank" style="color: #64D2FF; font-size: 12px; font-weight: 600; text-decoration: none;">
                        Open Location on Google Maps &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Reporter Contact & Special Instructions -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #0E1A2E; border-radius: 10px; border: 1px solid rgba(159, 201, 255, 0.12); padding: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #9FC9FF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      👤 CITIZEN REPORTER DETAILS
                    </div>
                    ${reporterDetailsHtml}
                    ${
                      report.reporter.additionalMessage
                        ? `<div style="margin-top: 10px; font-size: 12px; color: #CBD5E1; font-style: italic; background-color: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 6px; border-left: 3px solid #64D2FF;">
                            <strong>Note for Officer:</strong> "${escapeHtml(report.reporter.additionalMessage)}"
                          </div>`
                        : ''
                    }
                  </td>
                </tr>
              </table>

              <!-- Attached PDF Notice -->
              <div style="background-color: rgba(10, 132, 255, 0.12); border: 1px dashed rgba(100, 210, 255, 0.4); border-radius: 10px; padding: 14px 18px; margin-bottom: 28px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="30" valign="middle">
                      <span style="font-size: 20px;">📄</span>
                    </td>
                    <td valign="middle">
                      <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">
                        Official Incident Dossier Attached (Civiora_Report_${escapeHtml(report.incidentNumber)}.pdf)
                      </div>
                      <div style="font-size: 11px; color: #94A3B8;">
                        Includes tamper-resistant vector dossier, photographic evidence log, AI triage annotations, and verified GIS coordinates.
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px; box-shadow: 0 4px 15px rgba(10, 132, 255, 0.4);">
                      Open Command Center &amp; Assign Crew &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Strip -->
          <tr>
            <td style="padding: 24px 32px; background-color: #060D19; border-top: 1px solid rgba(159, 201, 255, 0.1); text-align: center; font-size: 11px; color: #64748B; line-height: 1.5;">
              This transmission is an automated municipal alert from the Civiora AI Platform.<br>
              Tamil Nadu Civic Resilience Network • Confidential Government Operational Transmission.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Builds the plain text alternative for email clients that strip HTML.
 */
function buildMunicipalEmailText(report: IncidentReportDTO): string {
  const reporterText = report.reporter.consentGiven
    ? `Name:    ${report.reporter.name || 'Citizen Reporter'}
Email:   ${report.reporter.email || 'Not provided'}
Phone:   ${report.reporter.phone || 'Not provided'}
Consent: Authorized contact sharing for municipal follow-up`
    : `Identity & Contact: Withheld by Citizen Request (Anonymous)
Consent: Not authorized for contact sharing`;

  const aiText =
    report.aiFindings?.suggestedCategory || report.aiFindings?.confidence
      ? `
AI TRIAGE SUGGESTIONS:
Suggested:  ${report.aiFindings.suggestedCategory || report.categoryLabel}
Confidence: ${report.aiFindings.confidence !== undefined ? `${Math.round(report.aiFindings.confidence * 100)}%` : 'N/A'}
Detections: ${report.aiFindings.detectedObjects?.join(', ') || 'None'}
Notice:     AI suggestions are advisory tools for preliminary triage.
`
      : '';

  return `
[CIVIORA MUNICIPAL INCIDENT ALERT]
============================================================
Incident Reference: ${report.incidentNumber}
Priority:           ${report.priority.toUpperCase()} (${report.risk.score}/100)
Status:             ${report.statusLabel}
Issued Date:        ${new Date(report.createdAt).toLocaleString()}

TITLE:
${report.title}

CATEGORY:
${report.categoryLabel} ${report.subcategory ? `(${report.subcategory})` : ''}

DESCRIPTION:
${report.description}
${aiText}
LOCATION:
Address:     ${report.location.address || 'Address not specified'}
Coordinates: ${report.location.latitude.toFixed(5)}, ${report.location.longitude.toFixed(5)}
Google Maps: ${report.location.googleMapsUrl}

REPORTER CONTACT:
${reporterText}
Officer Message: ${report.reporter.additionalMessage || 'Standard civic triage dispatch.'}

ATTACHMENT:
Authoritative PDF dossier attached: Civiora_Report_${report.incidentNumber}.pdf

COMMAND CENTER:
${env.FRONTEND_URL}/dashboard
============================================================
Civiora Statewide Urban Resilience Network
`;
}

/**
 * Dispatches an incident report to the configured municipal recipient via Resend with PDF attachment.
 */
export async function dispatchIncidentReport(
  report: IncidentReportDTO,
  idempotencyKey?: string
): Promise<DispatchResult> {
  const recipientEmail = env.MUNICIPAL_RECEIVER_EMAIL;

  // 1. Check idempotency: avoid duplicate sends within 2 minutes
  if (idempotencyKey) {
    const existing = await DispatchRecord.findOne({
      idempotencyKey,
      status: 'sent',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
    });

    if (existing) {
      logger.info({ incidentNumber: report.incidentNumber }, '[Dispatch] Returning existing idempotent dispatch result');
      return {
        success: true,
        incidentNumber: report.incidentNumber,
        recipientEmail: existing.recipientEmail,
        status: existing.provider === 'mock' ? 'simulated' : 'sent',
        providerMessageId: existing.providerMessageId,
        pdfSizeBytes: existing.pdfSizeBytes || 0,
        message: 'Incident report was already dispatched successfully.',
        dispatchedAt: existing.dispatchedAt.toISOString(),
      };
    }
  }

  // 2. Initialize dispatch record
  const dispatchRecord = new DispatchRecord({
    incidentId: report.incidentId,
    incidentNumber: report.incidentNumber,
    recipientEmail,
    reporterName: report.reporter.consentGiven ? report.reporter.name : 'Anonymous',
    reporterEmail: report.reporter.consentGiven ? report.reporter.email : 'withheld@civiora.app',
    reporterPhone: report.reporter.consentGiven ? report.reporter.phone : undefined,
    additionalMessage: report.reporter.additionalMessage,
    idempotencyKey,
    status: 'generating_pdf',
    provider: env.EMAIL_DELIVERY_ENABLED && env.RESEND_API_KEY ? 'resend' : 'mock',
    dispatchedAt: new Date(),
  });
  await dispatchRecord.save();

  // 3. Generate and validate authoritative PDF document
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateIncidentPdf(report);

    // Validate that the generated PDF buffer is non-empty and starts with the expected PDF signature
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty (0 bytes)');
    }
    const signature = pdfBuffer.subarray(0, 5).toString('ascii');
    if (signature !== '%PDF-') {
      throw new Error(`Invalid PDF signature "${signature}" (expected "%PDF-")`);
    }

    dispatchRecord.pdfSizeBytes = pdfBuffer.length;
    dispatchRecord.status = 'pending';
    await dispatchRecord.save();
  } catch (pdfErr: any) {
    logger.error({ err: pdfErr }, '[Dispatch] PDF generation failed during dispatch');
    dispatchRecord.status = 'failed';
    dispatchRecord.errorMessage = `PDF generation error: ${pdfErr.message}`;
    await dispatchRecord.save();

    return {
      success: false,
      incidentNumber: report.incidentNumber,
      recipientEmail,
      status: 'failed',
      pdfSizeBytes: 0,
      message: `Failed to generate official PDF report dossier: ${pdfErr.message}`,
      error: pdfErr.message,
      dispatchedAt: dispatchRecord.dispatchedAt.toISOString(),
    };
  }

  // 4. Send email via Resend (or mock fallback if disabled/unconfigured in dev)
  const isRealDelivery = env.EMAIL_DELIVERY_ENABLED && !!env.RESEND_API_KEY;

  if (isRealDelivery) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const senderAddress = env.RESEND_FROM_EMAIL.includes('<')
        ? env.RESEND_FROM_EMAIL
        : `Civiora Municipal Command <${env.RESEND_FROM_EMAIL}>`;

      // Safe replyTo sanitization: only pass if valid email and citizen consent granted
      let replyToAddress: string | undefined = undefined;
      if (
        report.reporter.consentGiven &&
        report.reporter.email &&
        report.reporter.email.includes('@') &&
        !report.reporter.email.endsWith('@civiora.app') &&
        !report.reporter.email.includes('anonymous')
      ) {
        replyToAddress = report.reporter.email.trim();
      }

      const emailPayload: any = {
        from: senderAddress,
        to: [recipientEmail],
        subject: `[Civiora Civic Report] ${report.incidentNumber} — ${report.categoryLabel} — ${report.priority.toUpperCase()}`,
        html: buildMunicipalEmailHtml(report),
        text: buildMunicipalEmailText(report),
        attachments: [
          {
            filename: `Civiora_Report_${report.incidentNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      };

      if (replyToAddress) {
        emailPayload.replyTo = replyToAddress;
      }

      const sendResponse = await resend.emails.send(emailPayload);

      if (sendResponse.error) {
        logger.error({ error: sendResponse.error }, '[Dispatch] Resend returned delivery error');
        dispatchRecord.status = 'failed';
        dispatchRecord.errorMessage = sendResponse.error.message || 'Resend rejected transmission';
        await dispatchRecord.save();

        return {
          success: false,
          incidentNumber: report.incidentNumber,
          recipientEmail,
          status: 'failed',
          pdfSizeBytes: pdfBuffer.length,
          message: `Municipal email delivery failed: ${sendResponse.error.message}`,
          error: sendResponse.error.message,
          dispatchedAt: dispatchRecord.dispatchedAt.toISOString(),
        };
      }

      const messageId = sendResponse.data?.id || `resend-${nanoid(12)}`;
      dispatchRecord.status = 'sent';
      dispatchRecord.providerMessageId = messageId;
      dispatchRecord.completedAt = new Date();
      await dispatchRecord.save();

      logger.info(
        { incidentNumber: report.incidentNumber, messageId, recipientEmail },
        '[Dispatch] Real Resend email sent with PDF attachment successfully'
      );

      return {
        success: true,
        incidentNumber: report.incidentNumber,
        recipientEmail,
        status: 'sent',
        providerMessageId: messageId,
        pdfSizeBytes: pdfBuffer.length,
        message: `Official incident dossier transmitted to Municipal Command (${recipientEmail}).`,
        dispatchedAt: dispatchRecord.dispatchedAt.toISOString(),
      };
    } catch (sendErr: any) {
      logger.error({ err: sendErr }, '[Dispatch] Resend delivery encountered failure');
      dispatchRecord.status = 'failed';
      dispatchRecord.errorMessage = sendErr.message || 'Delivery error';
      await dispatchRecord.save();

      return {
        success: false,
        incidentNumber: report.incidentNumber,
        recipientEmail,
        status: 'failed',
        pdfSizeBytes: pdfBuffer.length,
        message: `Municipal email dispatch failed: ${sendErr.message}`,
        error: sendErr.message,
        dispatchedAt: dispatchRecord.dispatchedAt.toISOString(),
      };
    }
  } else {
    // Development / Simulation Mode
    const mockMessageId = `mock-resend-${nanoid(10)}`;
    dispatchRecord.status = 'sent';
    dispatchRecord.provider = 'mock';
    dispatchRecord.providerMessageId = mockMessageId;
    dispatchRecord.completedAt = new Date();
    await dispatchRecord.save();

    logger.info(
      {
        incidentNumber: report.incidentNumber,
        mockMessageId,
        recipientEmail,
        pdfSizeBytes: pdfBuffer.length,
      },
      '[Dispatch] Simulated delivery active (EMAIL_DELIVERY_ENABLED=false or RESEND_API_KEY omitted). Dossier verified.'
    );

    return {
      success: true,
      incidentNumber: report.incidentNumber,
      recipientEmail,
      status: 'simulated',
      providerMessageId: mockMessageId,
      pdfSizeBytes: pdfBuffer.length,
      message: `[Simulated Mode] Incident report verified and queued for municipal dispatch to ${recipientEmail}.`,
      dispatchedAt: dispatchRecord.dispatchedAt.toISOString(),
    };
  }
}
