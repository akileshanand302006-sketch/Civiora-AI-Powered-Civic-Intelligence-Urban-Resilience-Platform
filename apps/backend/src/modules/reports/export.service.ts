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

