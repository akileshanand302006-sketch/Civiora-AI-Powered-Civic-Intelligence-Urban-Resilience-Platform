import { inngest } from '../client.js';
import { Types } from 'mongoose';
import { Incident } from '../../modules/incidents/incident.model.js';
import { User } from '../../modules/users/user.model.js';
import { Notification } from '../../modules/notifications/notification.model.js';
import { recordChainedIncidentEvent } from '../../modules/incidents/incidentEvent.model.js';
import { logger } from '../../utils/logger.js';
import { emitToOrg } from '../../socket/socketServer.js';
import { SOCKET_EVENTS } from '@civicpulse/shared';

export const automatedSlaDelayWorkflow = inngest.createFunction(
  {
    id: 'automated-sla-delays',
    name: 'Automated SLA Escalation & Deadline Delay Monitoring',
    triggers: [{ event: 'incident/assigned' }],
    retries: 2,
  },
  async ({ event, step }: any) => {
    const { incidentId, incidentNumber, priority, slaHours = 24 } = event.data;

    logger.info(
      { incidentNumber, priority, slaHours },
      '[Inngest Workflow] Initiated automated SLA delay monitoring workflow'
    );

    // Calculate delay durations
    const totalMinutes = Math.max(2, Math.round(slaHours * 60));
    const halfwayMinutes = Math.max(1, Math.round(totalMinutes / 2));
    const remainingMinutes = totalMinutes - halfwayMinutes;

    // Automated SLA Delay 1: Halfway Approaching Deadline
    await step.sleep('wait-halfway-delay', `${halfwayMinutes}m`);

    // Evaluate Halfway Warning
    const halfwayStatus = await step.run('evaluate-halfway-status', async () => {
      const incident = await Incident.findById(incidentId);
      if (!incident) return { continueMonitoring: false, resolved: true };

      if (['resolved', 'closed'].includes(incident.status)) {
        logger.info({ incidentNumber }, '[Inngest SLA] Incident already resolved before halfway deadline');
        return { continueMonitoring: false, resolved: true };
      }

      // If unresolved, escalate warning to Department Manager
      incident.sla.escalationLevel = Math.max(incident.sla.escalationLevel || 0, 1);
      await incident.save();

      // Find responsible department managers
      const managers = await User.find({
        role: { $in: ['manager', 'system_admin'] },
        isActive: true,
        ...(incident.departmentId ? { departmentId: incident.departmentId } : {}),
      }).select('_id email');

      for (const mgr of managers) {
        await Notification.create({
          userId: mgr._id,
          organizationId: incident.organizationId,
          type: 'SLA_APPROACHING_DEADLINE',
          title: `⚠️ 50% SLA Window Elapsed — ${incidentNumber}`,
          message: `Hazard ${incidentNumber} (${incident.title}) has reached 50% of its ${slaHours}h SLA target. Current status: ${incident.status}.`,
          data: { incidentId: incident._id, incidentNumber, priority, status: incident.status },
        });
      }

      emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, {
        incidentNumber,
        slaWarning: 'halfway_elapsed',
      });

      return { continueMonitoring: true, resolved: false };
    });

    if (!halfwayStatus.continueMonitoring) {
      return { status: 'completed_early', reason: 'incident_resolved' };
    }

    // Automated SLA Delay 2: Wait until final SLA deadline
    await step.sleep('wait-deadline-delay', `${remainingMinutes}m`);

    // Evaluate SLA Breach
    const breachResult = await step.run('evaluate-sla-breach', async () => {
      const incident = await Incident.findById(incidentId);
      if (!incident) return { breached: false };

      if (['resolved', 'closed'].includes(incident.status)) {
        return { breached: false, resolved: true };
      }

      // Mark SLA breached
      incident.sla.breached = true;
      incident.sla.escalationLevel = 2;
      await incident.save();

      // Record to tamper-evident audit ledger
      await recordChainedIncidentEvent({
        incidentId: incident._id,
        organizationId: incident.organizationId,
        actorId: incident.assignedTo || new Types.ObjectId(),
        action: 'SLA_BREACHED',
        eventType: 'SLA_BREACHED',
        notes: `Automated SLA timer exceeded ${slaHours}h target without resolution.`,
        correlationId: `SLA-${Date.now()}`,
      });

      // Alert System Admin & Department Managers
      const leadership = await User.find({
        role: { $in: ['system_admin', 'manager'] },
        isActive: true,
      }).select('_id email');

      for (const lead of leadership) {
        await Notification.create({
          userId: lead._id,
          organizationId: incident.organizationId,
          type: 'SLA_BREACH_ALERT',
          title: `🚨 CRITICAL SLA BREACH — ${incidentNumber}`,
          message: `Hazard ${incidentNumber} has breached its ${slaHours}h SLA resolution deadline! Immediate managerial intervention required.`,
          data: { incidentId: incident._id, incidentNumber, priority, slaHours },
        });
      }

      emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, {
        incidentNumber,
        slaBreached: true,
      });

      logger.warn({ incidentNumber, slaHours }, '[Inngest SLA] Incident breached SLA deadline');
      return { breached: true };
    });

    return {
      incidentNumber,
      breached: breachResult.breached,
      completedAt: new Date().toISOString(),
    };
  }
);
