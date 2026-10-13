import { serve } from 'inngest/express';
import { inngest } from './client.js';
import { dispatchIncidentWorkflow } from './functions/dispatchIncident.js';
import { resolutionWorkflow } from './functions/resolutionWorkflow.js';
import { automatedSlaDelayWorkflow } from './functions/slaDelayWorkflow.js';
import { logger } from '../utils/logger.js';

export { inngest } from './client.js';
export { dispatchIncidentWorkflow } from './functions/dispatchIncident.js';
export { resolutionWorkflow } from './functions/resolutionWorkflow.js';
export { automatedSlaDelayWorkflow } from './functions/slaDelayWorkflow.js';

/**
 * Single API route handler serving all Civiora Inngest workflows
 * Mountable via Express at /api/inngest or /api/v1/inngest
 */
export const inngestHandler = serve({
  client: inngest,
  functions: [
    dispatchIncidentWorkflow,
    resolutionWorkflow,
    automatedSlaDelayWorkflow,
  ],
});

/**
 * Helper to emit an event to Inngest safely
 */
export async function emitInngestEvent(name: string, data: Record<string, any>): Promise<void> {
  try {
    await inngest.send({
      name: name as any,
      data,
    });
    logger.info({ event: name }, '[Inngest] Event dispatched to workflow queue');
  } catch (err: any) {
    logger.warn({ event: name, err: err.message }, '[Inngest] Background event queue note (standalone mode)');
  }
}
