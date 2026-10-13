import { inngest } from '../client.js';
import { Types } from 'mongoose';
import { Incident } from '../../modules/incidents/incident.model.js';
import { User } from '../../modules/users/user.model.js';
import { Notification } from '../../modules/notifications/notification.model.js';
import { buildIncidentReportDTO } from '../../modules/reports/report.dto.js';
import { dispatchIncidentReport } from '../../modules/reports/dispatch.service.js';
import { logger } from '../../utils/logger.js';
import { emitToOrg, emitToUser } from '../../socket/socketServer.js';
import { SOCKET_EVENTS } from '@civicpulse/shared';

export const dispatchIncidentWorkflow = inngest.createFunction(
  {
    id: 'dispatch-incident-workflow',
    name: 'Municipal Incident Dispatch & PDF Email Delivery',
    triggers: [{ event: 'incident/dispatched' }],
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { incidentId, incidentNumber, reporterName, reporterEmail, reporterPhone, additionalMessage, consent, idempotencyKey } = event.data;

    logger.info({ incidentNumber }, '[Inngest Workflow] Starting Municipal Incident Dispatch');

    // Step 1: Resolve Incident & Build Normalized DTO
    const incidentData = await step.run('resolve-incident', async () => {
      const orConditions: any[] = [
        { incidentNumber },
        { incidentNumber: { $regex: new RegExp(`^${incidentNumber}$`, 'i') } },
      ];
      if (Types.ObjectId.isValid(incidentId)) {
        orConditions.unshift({ _id: new Types.ObjectId(incidentId) });
      }

      const incident = await Incident.findOne({ $or: orConditions })
        .populate('reportedBy', 'profile email role')
        .populate('assignedTo', 'profile email role');

      if (!incident) {
        throw new Error(`Incident ${incidentNumber || incidentId} not found`);
      }

      const dto = buildIncidentReportDTO(incident, {
        name: reporterName,
        email: reporterEmail,
        phone: reporterPhone,
        additionalMessage,
        consent: consent !== false,
      });

      return {
        dto,
        organizationId: incident.organizationId?.toString(),
        departmentId: incident.departmentId?.toString(),
        priority: incident.priority,
        category: incident.category,
        title: incident.title,
        isEmergency: incident.isEmergency,
      };
    });

    // Step 2: Generate Vector PDF & Transmit via Resend
    const dispatchResult = await step.run('send-resend-email-with-pdf', async () => {
      const result = await dispatchIncidentReport(incidentData.dto, idempotencyKey);
      return result;
    });

    // Step 3: Role-Based Notification Broadcast to Department Stakeholders
    await step.run('notify-role-stakeholders', async () => {
      const staffQuery: any = {
        role: { $in: ['officer', 'manager', 'tenant_admin', 'field_worker', 'system_admin'] },
        isActive: true,
      };

      if (incidentData.departmentId && Types.ObjectId.isValid(incidentData.departmentId)) {
        staffQuery.$or = [
          { departmentId: new Types.ObjectId(incidentData.departmentId) },
          { role: 'system_admin' },
        ];
      }

      const staffMembers = await User.find(staffQuery).select('_id email role');

      if (staffMembers.length > 0) {
        const notifDocs = staffMembers.map((staff) => ({
          userId: staff._id,
          organizationId: incidentData.organizationId ? new Types.ObjectId(incidentData.organizationId) : undefined,
          type: incidentData.isEmergency ? 'EMERGENCY_INCIDENT' : 'INCIDENT_CREATED',
          title: incidentData.isEmergency ? '🚨 Critical Emergency Incident' : 'New Civic Hazard Reported',
          message: `${incidentNumber}: ${incidentData.title} dispatched to municipal grid.`,
          data: {
            incidentId,
            incidentNumber,
            category: incidentData.category,
            priority: incidentData.priority,
            messageId: dispatchResult.providerMessageId,
          },
          channels: ['in_app', 'email'],
          isRead: false,
        }));

        await Notification.insertMany(notifDocs);

        // Real-time WebSocket emission
        for (const staff of staffMembers) {
          emitToUser(staff._id.toString(), SOCKET_EVENTS.NOTIFICATION_NEW, {
            title: incidentData.isEmergency ? '🚨 Critical Emergency Incident' : 'New Civic Hazard Reported',
            message: `${incidentNumber}: ${incidentData.title}`,
            incidentNumber,
          });
        }
      }

      if (incidentData.organizationId) {
        emitToOrg(incidentData.organizationId, SOCKET_EVENTS.INCIDENT_CREATED, {
          incidentNumber,
          dispatched: dispatchResult.success,
        });
      }

      return { notifiedStaffCount: staffMembers.length };
    });

    return {
      success: dispatchResult.success,
      incidentNumber,
      messageId: dispatchResult.providerMessageId,
      recipient: dispatchResult.recipientEmail,
      pdfSizeBytes: dispatchResult.pdfSizeBytes,
    };
  }
);
