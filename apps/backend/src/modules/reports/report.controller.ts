// ============================================================
// Civiora - Incident Report Controller
// Endpoints for PDF Generation, JSON/CSV Export, and Dispatch
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { Types } from 'mongoose';
import { Incident } from '../incidents/incident.model.js';
import { buildIncidentReportDTO } from './report.dto.js';
import { generateIncidentPdf } from './pdfGenerator.service.js';
import { generateCsvExport, generateJsonExport, generateTxtExport } from './export.service.js';
import { dispatchIncidentReport } from './dispatch.service.js';
import { DispatchRecord } from './dispatch.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { emitInngestEvent } from '../../inngest/index.js';

/**
 * Helper to find an incident by Mongo _id or friendly incidentNumber
 */
async function resolveIncident(idParam: string, _orgId?: string) {
  if (!idParam || idParam === 'undefined' || idParam === 'null') {
    throw new BadRequestError('A valid incident ID or incident number is required');
  }

  const orConditions: any[] = [
    { incidentNumber: idParam },
    { incidentNumber: { $regex: new RegExp(`^${idParam}$`, 'i') } },
  ];

  if (Types.ObjectId.isValid(idParam)) {
    orConditions.unshift({ _id: new Types.ObjectId(idParam) });
  }

  const incident = await Incident.findOne({ $or: orConditions })
    .populate('reportedBy', 'profile email role')
    .populate('assignedTo', 'profile email role');

  if (!incident) {
    throw new NotFoundError('Incident', idParam);
  }

  return incident;
}

/**
 * GET /api/v1/incidents/:id/report.pdf
 * POST /api/v1/incidents/:id/report/pdf
 * Generates and streams vector PDF dossier directly to the client
 */
export async function getReportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    const incident = await resolveIncident(id, orgId);

    // Reporter overrides can be passed via POST body or query
    const overrides = req.body || {};
    const dto = buildIncidentReportDTO(incident, {
      name: overrides.name || overrides.reporterName,
      email: overrides.email || overrides.reporterEmail,
      phone: overrides.phone || overrides.reporterPhone,
      additionalMessage: overrides.additionalMessage || (req.query.message as string),
      consent: (overrides.consent ?? overrides.consentToShareContact) !== false,
    });

    const pdfBuffer = await generateIncidentPdf(dto);

    const safeRef = (dto.incidentNumber || 'civiora-report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Civiora_Report_${safeRef}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    const dispositionType = req.query.disposition === 'inline' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/incidents/:id/report/export?format=pdf|json|csv|txt
 * Exports normalized incident data in PDF, JSON, RFC-4180 CSV, or plain text format
 */
export async function exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const format = ((req.query.format as string) || 'json').toLowerCase();
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    const incident = await resolveIncident(id, orgId);

    const dto = buildIncidentReportDTO(incident, {
      additionalMessage: req.query.message as string,
      consent: req.query.consent !== 'false',
    });

    const safeRef = (dto.incidentNumber || 'civiora-report').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'csv') {
      const csv = generateCsvExport(dto);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Civiora-Incident-${safeRef}.csv"`);
      res.send(csv);
      return;
    }

    if (format === 'json') {
      const json = generateJsonExport(dto);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Civiora-Incident-${safeRef}.json"`);
      res.send(json);
      return;
    }

    if (format === 'txt' || format === 'text') {
      const txt = generateTxtExport(dto);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Civiora-Incident-${safeRef}.txt"`);
      res.send(txt);
      return;
    }

    if (format === 'pdf') {
      const pdfBuffer = await generateIncidentPdf(dto);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Civiora_Report_${safeRef}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.end(pdfBuffer);
      return;
    }

    throw new BadRequestError(`Unsupported export format '${format}'. Supported: pdf, json, csv, txt`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/incidents/:id/dispatch
 * POST /api/v1/incidents/:id/dispatch/retry
 * One-Click Municipal Dispatch: generates PDF and sends email via Resend
 */
export async function dispatchReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const orgId = req.user ? req.user.org : (req.body.orgId as string);
    const incident = await resolveIncident(id, orgId);

    const {
      reporterName,
      reporterEmail,
      reporterPhone,
      name,
      email,
      phone,
      additionalMessage,
      consent,
      consentToShareContact,
      idempotencyKey,
    } = req.body || {};

    logger.info({
      msg: 'Municipal dispatch requested',
      incidentId: incident._id.toString(),
      incidentNumber: incident.incidentNumber,
      reporterEmail: email || reporterEmail || 'anonymous',
    });

    const dto = buildIncidentReportDTO(incident, {
      name: name || reporterName,
      email: email || reporterEmail,
      phone: phone || reporterPhone,
      additionalMessage,
      consent: (consent ?? consentToShareContact) !== false,
    });

    const result = await dispatchIncidentReport(dto, idempotencyKey);

    // Emit event to Inngest event-driven workflow orchestration
    emitInngestEvent('incident/dispatched', {
      incidentId: incident._id.toString(),
      incidentNumber: incident.incidentNumber,
      reporterName: name || reporterName,
      reporterEmail: email || reporterEmail,
      reporterPhone: phone || reporterPhone,
      additionalMessage,
      consent: (consent ?? consentToShareContact) !== false,
      idempotencyKey,
    });

    res.status(200).json({
      success: result.success,
      status: result.status,
      messageId: result.providerMessageId,
      recipient: result.recipientEmail,
      pdfSizeBytes: result.pdfSizeBytes,
      message: result.message,
      error: result.error,
      timestamp: result.dispatchedAt,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/incidents/:id/dispatch/status
 * Fetches the latest dispatch attempts and verification logs for an incident
 */
export async function getDispatchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const incident = await resolveIncident(id);

    const records = await DispatchRecord.find({ incidentId: incident._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        incidentId: incident._id,
        incidentNumber: incident.incidentNumber,
        dispatches: records,
        latestStatus: records[0]?.status || 'never_dispatched',
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/incidents/:id/resolution.pdf
 * Streams the authoritative, versioned Final Resolution PDF Dossier
 */
export async function getResolutionPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const incident = await resolveIncident(id);

    // Permission check for citizen / worker
    if (req.user) {
      if (req.user.role === 'citizen') {
        const reporterId = (incident.reportedBy as any)?._id || incident.reportedBy;
        if (reporterId && String(reporterId) !== req.user.sub && incident.status !== 'resolved') {
          throw new BadRequestError('Access denied: You can only view resolution dossiers for your own reports');
        }
      } else if (req.user.role === 'field_worker') {
        const assignedId = (incident.assignedTo as any)?._id || incident.assignedTo;
        if (assignedId && String(assignedId) !== req.user.sub && incident.status !== 'resolved') {
          throw new BadRequestError('Access denied: Work order not assigned to you');
        }
      }
    }

    const { ResolutionDocument } = await import('./resolutionDocument.model.js');
    let doc = await ResolutionDocument.findOne({ incidentId: incident._id })
      .select('+pdfBufferBase64')
      .sort({ version: -1 });

    let pdfBuffer: Buffer;

    if (doc?.pdfBufferBase64) {
      pdfBuffer = Buffer.from(doc.pdfBufferBase64, 'base64');
    } else {
      // Regenerate on demand if incident is resolved
      const { generateResolutionPdf } = await import('./pdfGenerator.service.js');
      const { WorkSession } = await import('../operations/workSession.model.js');
      const workSession = await WorkSession.findOne({ incidentId: incident._id }).sort({ createdAt: -1 });

      const version = doc?.version || 1;
      const resolutionId = doc?.resolutionId || `RES-${incident.incidentNumber}-V${version}`;
      const now = incident.resolution?.resolvedAt || new Date();

      pdfBuffer = await generateResolutionPdf({
        incidentNumber: incident.incidentNumber,
        title: incident.title,
        categoryLabel: incident.category,
        locationAddress: incident.location.address,
        coordinates: incident.location.coordinates,
        submittedAt: incident.createdAt,
        resolvedAt: now,
        startedAt: workSession?.startedAt || incident.createdAt,
        completedAt: workSession?.completedAt || now,
        elapsedSeconds: workSession?.elapsedSeconds || 1800,
        activeWorkSeconds: workSession?.activeWorkSeconds || 1500,
        workerName: doc?.workerName || 'Municipal Field Operations',
        verifierName: doc?.verifierName || 'Department Authority',
        verifierRole: 'DEPARTMENT OFFICER',
        departmentName: doc?.departmentName || 'Public Works',
        completionSummary: workSession?.completionSummary || incident.resolution?.resolutionNotes || 'Hazard inspected and resolved.',
        inspectionNotes: workSession?.inspectionNotes,
        resolutionId,
        version,
        contentHash: doc?.contentHash || 'verified-resolution-digest',
      });
    }

    const safeRef = (incident.incidentNumber || 'civiora').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Civiora_Resolution_${safeRef}_v${doc?.version || 1}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    const dispositionType = req.query.disposition === 'inline' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/incidents/:id/resolution
 * Retrieves resolution document metadata and verification details
 */
export async function getResolutionDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const incident = await resolveIncident(id);

    const { ResolutionDocument } = await import('./resolutionDocument.model.js');
    const doc = await ResolutionDocument.findOne({ incidentId: incident._id }).sort({ version: -1 });

    if (!doc) {
      res.status(404).json({
        success: false,
        error: { message: 'Resolution dossier not found for this incident' },
      });
      return;
    }

    res.json({
      success: true,
      data: doc,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
