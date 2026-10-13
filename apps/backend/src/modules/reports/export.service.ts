// ============================================================
// Civiora - Incident Report Export Service (JSON / CSV)
// Professional, normalized incident export matching RFC-4180
// ============================================================

import type { IncidentReportDTO } from './report.dto.js';

/**
 * Escapes a single CSV field value according to RFC-4180:
 * - Wrap in double quotes if it contains commas, double quotes, or newlines
 * - Double up any existing quotes
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an RFC-4180 compliant CSV export for an incident dossier
 */
export function generateCsvExport(report: IncidentReportDTO): string {
  const headers = [
    'Incident Reference',
    'Civic Category',
    'Severity / Priority',
    'Status',
    'Reported Timestamp',
    'Last Updated',
    'Street Address',
    'Locality / City',
    'District',
    'State',
    'Latitude',
    'Longitude',
    'Google Maps URL',
    'Reporter Name',
    'Reporter Email',
    'Reporter Phone',
    'Consent To Share Contact',
    'Incident Description',
    'Additional Reporter Message',
    'AI Hazard Category',
    'AI Confidence %',
    'AI Model Version',
    'Assigned Department',
    'SLA Deadline',
    'SLA Breached',
    'Evidence Photo Count',
    'Evidence URLs',
    'Export Timestamp',
  ];

  const row = [
    report.incidentNumber,
    report.categoryLabel,
    report.priority,
    report.statusLabel,
    report.createdAt,
    report.updatedAt,
    report.location.address || 'Not specified',
    report.location.city || '',
    report.location.district || '',
    report.location.state || '',
    report.location.latitude != null ? report.location.latitude.toFixed(6) : '',
    report.location.longitude != null ? report.location.longitude.toFixed(6) : '',
    report.location.googleMapsUrl || '',
    report.reporter.consentGiven ? report.reporter.name : 'Anonymous / Withheld',
    report.reporter.consentGiven ? report.reporter.email : 'Withheld',
    report.reporter.consentGiven ? (report.reporter.phone || '') : '',
    report.reporter.consentGiven ? 'Yes' : 'No',
    report.description,
    report.reporter.additionalMessage || '',
    report.aiFindings.suggestedCategory || 'N/A',
    report.aiFindings.confidence != null ? Math.round(report.aiFindings.confidence * 100) : 'N/A',
    report.aiFindings.modelVersion || 'N/A',
    report.operations.departmentName || 'Civic Infrastructure Command',
    report.operations.slaDeadline || 'Standard',
    report.operations.slaBreached ? 'Yes' : 'No',
    report.evidence.length,
    report.evidence.map((e) => e.url).join(' ; '),
    new Date().toISOString(),
  ];

  const headerLine = headers.map(escapeCsvValue).join(',');
  const rowLine = row.map(escapeCsvValue).join(',');

  return `${headerLine}\r\n${rowLine}\r\n`;
}

/**
 * Generates structured, sanitized JSON export for machine integration
 */
export function generateJsonExport(report: IncidentReportDTO): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generates clean, accessible plain-text formatted dossier
 */
export function generateTxtExport(report: IncidentReportDTO): string {
  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);

  const reporterBlock = report.reporter.consentGiven
    ? `Name                : ${report.reporter.name}
Email               : ${report.reporter.email}
Phone               : ${report.reporter.phone || 'N/A'}
Consent Authorized  : YES`
    : `Name                : Anonymous / Withheld
Email               : Withheld
Phone               : Withheld
Consent Authorized  : NO (Confidential Citizen Record)`;

  return `${divider}
CIVIORA CIVIC INTELLIGENCE DOSSIER — OFFICIAL MUNICIPAL REPORT
${divider}
Incident Reference  : ${report.incidentNumber}
Hazard Category     : ${report.categoryLabel}
Priority / Risk     : ${report.priority.toUpperCase()} (${report.risk.score}/100)
Status              : ${report.statusLabel}
Submission Date     : ${report.createdAt}
Last Updated        : ${report.updatedAt}

${subDivider}
1. GEOGRAPHIC INCIDENT LOCATION
${subDivider}
Address             : ${report.location.address}
City / District     : ${report.location.city || ''}, ${report.location.district || ''}, ${report.location.state || 'Tamil Nadu'}
Coordinates         : Latitude ${report.location.latitude != null ? report.location.latitude.toFixed(6) : 'N/A'}, Longitude ${report.location.longitude != null ? report.location.longitude.toFixed(6) : 'N/A'}
Google Maps Link    : ${report.location.googleMapsUrl || 'N/A'}

${subDivider}
2. INCIDENT DESCRIPTION & CONTEXT
${subDivider}
Title               : ${report.title}
Description         : ${report.description}

${subDivider}
3. AI COMPUTER VISION & HAZARD INTELLIGENCE
${subDivider}
AI Suggested Category : ${report.aiFindings.suggestedCategory || 'N/A'}
Model Confidence      : ${report.aiFindings.confidence != null ? `${Math.round(report.aiFindings.confidence * 100)}%` : 'N/A'}
Model Version         : ${report.aiFindings.modelVersion || 'Civiora Neural Engine'}
Detected Objects      : ${report.aiFindings.detectedObjects.length > 0 ? report.aiFindings.detectedObjects.join(', ') : 'None'}
Physical Context      : ${report.aiFindings.nlpIssue || 'N/A'}
Impact Assessment     : ${report.aiFindings.nlpImpact || 'N/A'}

${subDivider}
4. MUNICIPAL TRIAGE & DISPATCH ASSIGNMENT
${subDivider}
Jurisdiction / Dept : ${report.operations.departmentName || 'Civic Infrastructure Command'}
Assigned Response   : ${report.operations.assignedToName || 'Civic Rapid Response'} (${report.operations.assignedToRole || 'Field Unit'})
SLA Deadline Window : ${report.operations.slaDeadline || 'Standard Response Window'}
SLA Compliance      : ${report.operations.slaBreached ? 'ESCALATED / BREACH WARNING' : 'WITHIN COMPLIANCE'}

${subDivider}
5. CITIZEN REPORTER DETAILS
${subDivider}
${reporterBlock}
Special Instructions: ${report.reporter.additionalMessage || 'None provided'}

${subDivider}
Civiora AI-Powered Civic Intelligence & Urban Resilience Platform
Statewide Tamil Nadu Municipal Command System
${divider}
`;
}

/**
 * Generates structured JSON export for final resolution dossier
 */
export function generateResolutionJsonExport(doc: any, incident: any): string {
  return JSON.stringify(
    {
      documentType: 'CIVIORA_FINAL_RESOLUTION_DOSSIER',
      resolutionId: doc.resolutionId,
      incidentNumber: doc.incidentNumber || incident.incidentNumber,
      version: doc.version || 1,
      status: doc.status || 'approved',
      verificationChecksum: doc.contentHash,
      incident: {
        id: incident._id?.toString() || incident.id,
        title: incident.title,
        category: incident.category,
        address: incident.location?.address,
        coordinates: incident.location?.coordinates,
        submittedAt: incident.createdAt,
        resolvedAt: incident.resolution?.resolvedAt || doc.completedAt,
      },
      operations: {
        department: doc.departmentName || 'Public Works',
        fieldWorker: doc.workerName || 'Municipal Field Operations',
        approvingOfficer: doc.verifierName || 'Department Authority',
        startedAt: doc.startedAt,
        completedAt: doc.completedAt,
        totalDurationSeconds: doc.totalDurationSeconds,
        activeDurationSeconds: doc.activeDurationSeconds,
      },
      findings: {
        completionSummary: doc.completionSummary,
        inspectionNotes: doc.inspectionNotes || 'Hazard inspected and resolved according to municipal compliance.',
      },
      generatedAt: doc.generatedAt || new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * Generates RFC-4180 CSV export for final resolution dossier
 */
export function generateResolutionCsvExport(doc: any, incident: any): string {
  const headers = [
    'Resolution Reference',
    'Incident Reference',
    'Document Version',
    'Incident Title',
    'Civic Category',
    'Street Address',
    'Department',
    'Field Worker',
    'Approving Verifier',
    'Started At',
    'Completed At',
    'Active Minutes',
    'Completion Summary',
    'Inspection Notes',
    'Verification Checksum',
    'Exported At',
  ];

  const row = [
    doc.resolutionId,
    doc.incidentNumber || incident.incidentNumber,
    doc.version || 1,
    incident.title,
    incident.category,
    incident.location?.address || 'N/A',
    doc.departmentName || 'Public Works',
    doc.workerName || 'Municipal Field Operations',
    doc.verifierName || 'Department Authority',
    doc.startedAt ? new Date(doc.startedAt).toISOString() : '',
    doc.completedAt ? new Date(doc.completedAt).toISOString() : '',
    doc.activeDurationSeconds ? Math.round(doc.activeDurationSeconds / 60) : 0,
    doc.completionSummary || '',
    doc.inspectionNotes || '',
    doc.contentHash || '',
    new Date().toISOString(),
  ];

  const headerLine = headers.map(escapeCsvValue).join(',');
  const rowLine = row.map(escapeCsvValue).join(',');

  return `${headerLine}\r\n${rowLine}\r\n`;
}

/**
 * Generates clean plain text report for final resolution dossier
 */
export function generateResolutionTxtExport(doc: any, incident: any): string {
  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);

  return `${divider}
CIVIORA MUNICIPAL RESOLUTION DOSSIER — FINAL VERIFIED COMPLETION CERTIFICATE
${divider}
Resolution Reference : ${doc.resolutionId}
Incident Reference   : ${doc.incidentNumber || incident.incidentNumber}
Document Version     : Version ${doc.version || 1} (Official Archive)
SHA-256 Checksum     : ${doc.contentHash || 'N/A'}
Status               : VERIFIED & CLOSED

${subDivider}
1. INCIDENT CONTEXT
${subDivider}
Incident Title       : ${incident.title}
Category             : ${incident.category}
Location Address     : ${incident.location?.address || 'N/A'}
Reported At          : ${incident.createdAt ? new Date(incident.createdAt).toISOString() : 'N/A'}
Resolved At          : ${doc.completedAt ? new Date(doc.completedAt).toISOString() : 'N/A'}

${subDivider}
2. FIELD REMEDIATION & VERIFICATION
${subDivider}
Department           : ${doc.departmentName || 'Public Works'}
Assigned Worker      : ${doc.workerName || 'Municipal Field Operations'}
Approving Verifier   : ${doc.verifierName || 'Department Authority'}
Active Work Duration : ${doc.activeDurationSeconds ? `${Math.round(doc.activeDurationSeconds / 60)} minutes` : 'N/A'}

${subDivider}
3. COMPLETION NOTES & AUDIT EVIDENCE
${subDivider}
Summary              : ${doc.completionSummary || 'Remediation completed.'}
Inspection Details   : ${doc.inspectionNotes || 'Site verified and restored to safety standards.'}

${subDivider}
Civiora AI-Powered Civic Intelligence & Urban Resilience Platform
Statewide Tamil Nadu Municipal Command System
${divider}
`;
}

