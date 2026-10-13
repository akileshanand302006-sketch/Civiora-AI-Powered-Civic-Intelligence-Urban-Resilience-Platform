import { Inngest } from 'inngest';

/**
 * Civiora Inngest Client
 * Orchestrates event-driven workflows, role-based notifications,
 * and automated SLA delay timers via a single API route.
 */
export const inngest = new Inngest({
  id: 'civiora',
  name: 'Civiora Civic Operations & Resilience Platform',
  eventKey: process.env.INNGEST_EVENT_KEY || 'dev-inngest-key',
});
