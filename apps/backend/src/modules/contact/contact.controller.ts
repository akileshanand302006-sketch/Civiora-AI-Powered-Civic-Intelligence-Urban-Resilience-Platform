// ============================================================
// Civiora - Contact Controller
// Handles citizen inquiry submissions, incident linking,
// rate limiting validation, and municipal notifications via Resend
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { Types } from 'mongoose';
import { ContactInquiry, type ContactCategory } from './contact.model.js';
import { Incident } from '../incidents/incident.model.js';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { Resend } from 'resend';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Escapes HTML characters for safe template rendering
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * POST /api/v1/contact
 * Handles new contact inquiries
 */
export async function submitInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      email,
      phone,
      category = 'general',
      subject,
      message,
      incidentReference,
    } = req.body || {};

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestError('Full name must be at least 2 characters long');
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new BadRequestError('A valid email address is required');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      throw new BadRequestError('Subject must be at least 3 characters long');
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      throw new BadRequestError('Message must be at least 10 characters long');
    }

    const validCategories: ContactCategory[] = [
      'general',
      'support',
      'municipal',
      'partnership',
      'incident_report',
    ];

    if (!validCategories.includes(category)) {
      throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // 2. Incident Reference Validation (if provided)
    let linkedIncidentId: Types.ObjectId | undefined;
    let linkedIncidentNumber: string | undefined;

    if (incidentReference && typeof incidentReference === 'string' && incidentReference.trim()) {
      const trimmedRef = incidentReference.trim();
      const incQuery: Record<string, any> = Types.ObjectId.isValid(trimmedRef)
        ? { _id: new Types.ObjectId(trimmedRef) }
        : { incidentNumber: trimmedRef };

      const foundIncident = await Incident.findOne(incQuery).select('_id incidentNumber title status');
      if (!foundIncident) {
        throw new BadRequestError(`Referenced incident '${trimmedRef}' was not found in the Civiora registry.`);
      }
      linkedIncidentId = foundIncident._id;
      linkedIncidentNumber = foundIncident.incidentNumber;
    }

    // 3. Persist Contact Inquiry in MongoDB
    const inquiry = new ContactInquiry({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      category,
      subject: subject.trim(),
      message: message.trim(),
      incidentId: linkedIncidentId,
      incidentNumber: linkedIncidentNumber,
      status: 'received',
      clientIp: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    await inquiry.save();

    // 4. Send Email Notification via Resend (Server-side only)
    let emailDispatched = false;
    let emailMessageId: string | undefined;

    if (env.RESEND_API_KEY && env.EMAIL_DELIVERY_ENABLED) {
      try {
        const resend = new Resend(env.RESEND_API_KEY);
        const recipient = env.MUNICIPAL_RECEIVER_EMAIL;
        const sender = env.RESEND_FROM_EMAIL;

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Civiora Contact Inquiry</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f9fafb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #0b1528; border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #091326 0%, #1e3a8a 100%); padding: 24px 32px; border-bottom: 1px solid rgba(59, 130, 246, 0.3);">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">CIVIORA CONTACT CENTER</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #93c5fd;">New Citizen &amp; Stakeholder Inquiry Received</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 600;">Category</div>
                    <div style="font-size: 16px; color: #ffffff; font-weight: 600; text-transform: capitalize;">${escapeHtml(category)}</div>
                  </td>
                  <td style="padding-bottom: 16px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 600;">Sender</div>
                    <div style="font-size: 15px; color: #ffffff; font-weight: 500;">${escapeHtml(inquiry.name)} &lt;${escapeHtml(inquiry.email)}&gt;</div>
                  </td>
                </tr>
                ${
                  inquiry.phone
                    ? `<tr>
                        <td colspan="2" style="padding-bottom: 16px;">
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 600;">Contact Number</div>
                          <div style="font-size: 14px; color: #e2e8f0;">${escapeHtml(inquiry.phone)}</div>
                        </td>
                      </tr>`
                    : ''
                }
                ${
                  inquiry.incidentNumber
                    ? `<tr>
                        <td colspan="2" style="padding-bottom: 16px;">
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 600;">Related Incident</div>
                          <div style="font-size: 14px; color: #38bdf8; font-weight: 600;">${escapeHtml(inquiry.incidentNumber)}</div>
                        </td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td colspan="2" style="padding-bottom: 16px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 600;">Subject</div>
                    <div style="font-size: 16px; color: #ffffff; font-weight: 600;">${escapeHtml(inquiry.subject)}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 16px; background-color: rgba(15, 23, 42, 0.7); border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 8px;">Message</div>
                    <div style="font-size: 14px; color: #f1f5f9; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #060d1a; border-top: 1px solid rgba(59, 130, 246, 0.15); font-size: 12px; color: #64748b;">
              Civiora AI-Powered Civic Intelligence &amp; Urban Resilience Platform<br>
              Direct reply to this email will reach the sender directly at ${escapeHtml(inquiry.email)}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const plainText = `[Civiora Contact Inquiry]\n\nCategory: ${category}\nSender: ${inquiry.name} <${inquiry.email}>\nPhone: ${inquiry.phone || 'N/A'}\nRelated Incident: ${inquiry.incidentNumber || 'None'}\nSubject: ${inquiry.subject}\n\nMessage:\n${inquiry.message}\n\nCiviora Civic Intelligence Platform`;

        const sendResult = await resend.emails.send({
          from: sender,
          to: recipient,
          replyTo: inquiry.email,
          subject: `[Civiora Contact] ${inquiry.subject} — ${inquiry.name}`,
          html: htmlBody,
          text: plainText,
        });

        if (sendResult.data?.id) {
          emailDispatched = true;
          emailMessageId = sendResult.data.id;
          inquiry.status = 'forwarded_to_email';
          inquiry.emailMessageId = emailMessageId;
          await inquiry.save();
        } else if (sendResult.error) {
          logger.warn({
            msg: 'Resend contact inquiry notification rejected',
            error: sendResult.error,
          });
          inquiry.status = 'email_delivery_failed';
          await inquiry.save();
        }
      } catch (emailErr) {
        logger.error({
          msg: 'Failed to send contact notification email via Resend',
          err: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
        inquiry.status = 'email_delivery_failed';
        await inquiry.save();
      }
    } else {
      logger.info({
        msg: 'Contact inquiry stored (Email delivery disabled or simulated)',
        inquiryId: inquiry._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      inquiryId: inquiry._id,
      category: inquiry.category,
      emailNotified: emailDispatched,
      message: 'Your inquiry has been received. Our municipal coordination team will review and follow up with you.',
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/contact
 * Admin listing of received inquiries
 */
export async function listInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inquiries = await ContactInquiry.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: inquiries,
      total: inquiries.length,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
