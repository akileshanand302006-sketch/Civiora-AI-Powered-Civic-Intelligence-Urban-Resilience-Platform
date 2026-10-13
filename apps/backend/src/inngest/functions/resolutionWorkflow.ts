import { inngest } from '../client.js';
import { Incident } from '../../modules/incidents/incident.model.js';
import { ResolutionDocument } from '../../modules/reports/resolutionDocument.model.js';
import { DispatchRecord } from '../../modules/reports/dispatch.model.js';
import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { emitToOrg } from '../../socket/socketServer.js';
import { SOCKET_EVENTS } from '@civicpulse/shared';

export const resolutionWorkflow = inngest.createFunction(
  {
    id: 'resolution-workflow',
    name: 'Incident Resolution & Final PDF Dispatch',
    triggers: [{ event: 'incident/resolved' }],
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { incidentId, incidentNumber, verifierName, verifierNotes, resolutionId, version } = event.data;

    logger.info({ incidentNumber, resolutionId }, '[Inngest Workflow] Starting Resolution Delivery Workflow');

    // Step 1: Load Incident & Resolution PDF Document
    const resolutionDetails = await step.run('load-resolution-artifact', async () => {
      const incident = await Incident.findById(incidentId)
        .populate('reportedBy', 'profile email')
        .populate('assignedTo', 'profile email');

      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      const resDoc = await ResolutionDocument.findOne({ incidentId: incident._id, version: version || 1 });

      const citizenEmail = (incident.reportedBy as any)?.email;
      const workerEmail = (incident.assignedTo as any)?.email;

      return {
        incidentNumber: incident.incidentNumber,
        title: incident.title,
        citizenEmail,
        workerEmail,
        hasPdf: !!resDoc?.pdfBufferBase64,
        pdfBufferBase64: resDoc?.pdfBufferBase64,
        contentHash: resDoc?.contentHash,
        organizationId: incident.organizationId?.toString(),
      };
    });

    // Step 2: Deliver Resolution Email with Attached PDF via Resend
    const deliveryResult = await step.run('send-resolution-email', async () => {
      const recipientEmail = resolutionDetails.citizenEmail || env.MUNICIPAL_RECEIVER_EMAIL;
      const pdfBuffer = resolutionDetails.pdfBufferBase64
        ? Buffer.from(resolutionDetails.pdfBufferBase64, 'base64')
        : null;

      if (!env.RESEND_API_KEY || !env.EMAIL_DELIVERY_ENABLED) {
        return { status: 'simulated', recipient: recipientEmail };
      }

      try {
        const resend = new Resend(env.RESEND_API_KEY);
        const senderAddress = env.RESEND_FROM_EMAIL.includes('<')
          ? env.RESEND_FROM_EMAIL
          : `Civiora Municipal Command <${env.RESEND_FROM_EMAIL}>`;

        const attachments = pdfBuffer
          ? [
              {
                filename: `Civiora_Resolution_${resolutionDetails.incidentNumber}_v${version || 1}.pdf`,
                content: pdfBuffer,
              },
            ]
          : [];

        const emailResponse = await resend.emails.send({
          from: senderAddress,
          to: [recipientEmail],
          subject: `[Civiora RESOLVED] ${resolutionDetails.incidentNumber} — Work Verified & Completed`,
          html: `
            <div style="background-color: #050A14; color: #FFFFFF; font-family: sans-serif; padding: 24px; border-radius: 8px;">
              <h2 style="color: #30D158; margin-top: 0;">✓ Civic Hazard Successfully Resolved</h2>
              <p>Reference: <strong>${resolutionDetails.incidentNumber}</strong></p>
              <p>Issue: <strong>${resolutionDetails.title}</strong></p>
              <p>Verifier: <strong>${verifierName}</strong></p>
              <p>Verification Note: <em>${verifierNotes || 'Inspected and certified.'}</em></p>
              <p>Your official signed Civiora Resolution Dossier is attached to this email.</p>
              <div style="margin-top: 20px; font-size: 11px; color: #94A3B8;">
                Document Integrity SHA-256 Digest: <code>${resolutionDetails.contentHash || 'N/A'}</code>
              </div>
            </div>
          `,
          attachments,
        });

        // Record Delivery in DispatchRecord
        await DispatchRecord.create({
          incidentId,
          incidentNumber: resolutionDetails.incidentNumber,
          recipientEmail,
          reporterName: verifierName,
          reporterEmail: recipientEmail,
          additionalMessage: `Resolution approved by ${verifierName}`,
          status: emailResponse.error ? 'failed' : 'sent',
          provider: 'resend',
          providerMessageId: emailResponse.data?.id || 'resend-res-mock',
          pdfSizeBytes: pdfBuffer ? pdfBuffer.length : 0,
          dispatchedAt: new Date(),
          completedAt: new Date(),
        });

        return {
          status: emailResponse.error ? 'failed' : 'sent',
          messageId: emailResponse.data?.id,
          recipient: recipientEmail,
        };
      } catch (err: any) {
        logger.error({ err }, '[Inngest] Resolution email failed');
        return { status: 'failed', error: err.message };
      }
    });

    // Step 3: Broadcast Notifications to Stakeholders
    await step.run('notify-resolution-stakeholders', async () => {
      if (resolutionDetails.organizationId) {
        emitToOrg(resolutionDetails.organizationId, SOCKET_EVENTS.INCIDENT_UPDATED, {
          incidentNumber,
          status: 'resolved',
        });
      }
      return { notified: true };
    });

    return {
      success: true,
      incidentNumber,
      deliveryResult,
    };
  }
);
