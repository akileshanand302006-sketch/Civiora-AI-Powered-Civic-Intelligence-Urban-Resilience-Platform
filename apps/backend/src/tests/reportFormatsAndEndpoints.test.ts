// ============================================================
// Civiora — Exact File Formats, MIME Types & Extensions Test Suite
// Verifies PDF, TXT, JSON, and CSV downloads, Content-Disposition headers,
// filename sanitization, resolution vs incident separation, and error handling.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  generateReportFilename,
  sanitizeReportFilenameId,
  parseContentDispositionFilename,
  REPORT_FORMAT_SPECS,
  type ReportFormat,
} from '@civicpulse/shared';
import {
  generateCsvExport,
  generateJsonExport,
  generateTxtExport,
  generateResolutionCsvExport,
  generateResolutionJsonExport,
  generateResolutionTxtExport,
} from '../modules/reports/export.service.js';
import { generateIncidentPdf, generateResolutionPdf } from '../modules/reports/pdfGenerator.service.js';
import { buildIncidentReportDTO } from '../modules/reports/report.dto.js';

describe('Exact File Formats, MIME Types, and Filename Extensions', () => {
  const sampleIncidentNumber = 'CIV-12345';

  const mockIncident = {
    _id: '670cd1a89f1092a3b4c5d6e7',
    incidentNumber: sampleIncidentNumber,
    category: 'road_damage',
    title: 'Severe Asphalt Fissure on Mount Road',
    description: 'Deep road fissure hazardous to two-wheelers and buses.',
    status: 'resolved',
    priority: 'high',
    isEmergency: false,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    updatedAt: new Date('2026-10-12T15:00:00Z'),
    location: {
      address: 'Mount Road, Thousand Lights, Chennai, Tamil Nadu',
      coordinates: [80.25, 13.06],
      precisionLevel: 'exact',
    },
    risk: { score: 75, level: 'high', factors: [] },
    ai: {
      category: 'road_damage',
      confidence: 0.94,
      severity: 'high',
      detectedObjects: ['fissure', 'pavement crack'],
      modelVersion: 'Civiora-Neural-v2',
    },
    reportedBy: {
      profile: { firstName: 'Kavitha', lastName: 'Rajan' },
      email: 'kavitha@chennai.gov.in',
    },
    assignedTo: {
      profile: { firstName: 'Murugan', lastName: 'S' },
      email: 'murugan@highways.tn.gov.in',
      role: 'field_worker',
    },
    resolution: {
      resolvedAt: new Date('2026-10-12T15:00:00Z'),
      resolutionNotes: 'Asphalt repaved and hot-mix compacted to standard.',
    },
    evidence: [],
  };

  const mockResolutionDoc = {
    resolutionId: 'RES-CIV-12345-V1',
    incidentNumber: sampleIncidentNumber,
    version: 1,
    status: 'approved',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    workerName: 'Murugan S',
    verifierName: 'Eng. S. Sundaram',
    departmentName: 'State Highways Division',
    startedAt: new Date('2026-10-11T09:00:00Z'),
    completedAt: new Date('2026-10-12T15:00:00Z'),
    totalDurationSeconds: 108000,
    activeDurationSeconds: 14400,
    completionSummary: 'Asphalt repaved and hot-mix compacted to standard.',
    inspectionNotes: 'Verified load testing passed with zero deflection.',
    generatedAt: new Date('2026-10-12T15:05:00Z').toISOString(),
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Authoritative MIME types & extensions
  // ─────────────────────────────────────────────────────────────
  it('1. should define exact required MIME types and extensions for all supported formats', () => {
    expect(REPORT_FORMAT_SPECS.pdf.extension).toBe('.pdf');
    expect(REPORT_FORMAT_SPECS.pdf.mimeType).toBe('application/pdf');

    expect(REPORT_FORMAT_SPECS.txt.extension).toBe('.txt');
    expect(REPORT_FORMAT_SPECS.txt.mimeType).toBe('text/plain; charset=utf-8');

    expect(REPORT_FORMAT_SPECS.json.extension).toBe('.json');
    expect(REPORT_FORMAT_SPECS.json.mimeType).toBe('application/json; charset=utf-8');

    expect(REPORT_FORMAT_SPECS.csv.extension).toBe('.csv');
    expect(REPORT_FORMAT_SPECS.csv.mimeType).toBe('text/csv; charset=utf-8');

    // Never use generic .dossier extension or generic dossier mime types
    Object.values(REPORT_FORMAT_SPECS).forEach((spec) => {
      expect(spec.extension).not.toBe('.dossier');
      expect(spec.mimeType).not.toContain('dossier');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Incident vs Resolution filename distinction
  // ─────────────────────────────────────────────────────────────
  it('2. should generate correct, distinct filenames for incident vs resolution reports', () => {
    // Incident reports
    expect(generateReportFilename('incident', 'CIV-12345', 'pdf')).toBe('Civiora_Report_CIV-12345.pdf');
    expect(generateReportFilename('incident', 'CIV-12345', 'txt')).toBe('Civiora_Report_CIV-12345.txt');
    expect(generateReportFilename('incident', 'CIV-12345', 'json')).toBe('Civiora_Report_CIV-12345.json');
    expect(generateReportFilename('incident', 'CIV-12345', 'csv')).toBe('Civiora_Report_CIV-12345.csv');

    // Resolution reports
    expect(generateReportFilename('resolution', 'CIV-12345', 'pdf')).toBe('Civiora_Resolution_CIV-12345.pdf');
    expect(generateReportFilename('resolution', 'CIV-12345', 'pdf', 2)).toBe('Civiora_Resolution_CIV-12345_v2.pdf');
    expect(generateReportFilename('resolution', 'CIV-12345', 'txt')).toBe('Civiora_Resolution_CIV-12345.txt');
    expect(generateReportFilename('resolution', 'CIV-12345', 'json')).toBe('Civiora_Resolution_CIV-12345.json');
    expect(generateReportFilename('resolution', 'CIV-12345', 'csv')).toBe('Civiora_Resolution_CIV-12345.csv');

    // Filenames must never collide between document types
    const incidentPdf = generateReportFilename('incident', 'CIV-12345', 'pdf');
    const resolutionPdf = generateReportFilename('resolution', 'CIV-12345', 'pdf');
    expect(incidentPdf).not.toBe(resolutionPdf);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Filename sanitization against path traversal
  // ─────────────────────────────────────────────────────────────
  it('3. should sanitize user-controlled report IDs to prevent path traversal', () => {
    expect(sanitizeReportFilenameId('../../../etc/passwd')).toBe('etc_passwd');
    expect(sanitizeReportFilenameId('CIV/12345\\malicious:file*?')).toBe('CIV_12345_malicious_file');
    expect(sanitizeReportFilenameId('..\\..\\windows\\system32')).toBe('windows_system32');
    expect(sanitizeReportFilenameId('')).toBe('CIV-UNKNOWN');
    expect(sanitizeReportFilenameId(null)).toBe('CIV-UNKNOWN');

    const safeFilename = generateReportFilename('incident', '../../evil/civ-99', 'pdf');
    expect(safeFilename).toBe('Civiora_Report_evil_civ-99.pdf');
    expect(safeFilename).not.toContain('..');
    expect(safeFilename).not.toContain('/');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Content-Disposition parsing
  // ─────────────────────────────────────────────────────────────
  it('4. should safely parse quoted filenames and RFC 5987 UTF-8 filenames from Content-Disposition', () => {
    // Quoted standard filename
    const h1 = 'attachment; filename="Civiora_Report_CIV-12345.pdf"';
    expect(parseContentDispositionFilename(h1)).toBe('Civiora_Report_CIV-12345.pdf');

    // Single quoted filename
    const h2 = "attachment; filename='Civiora_Report_CIV-12345.csv'";
    expect(parseContentDispositionFilename(h2)).toBe('Civiora_Report_CIV-12345.csv');

    // Unquoted filename
    const h3 = 'attachment; filename=Civiora_Report_CIV-12345.json';
    expect(parseContentDispositionFilename(h3)).toBe('Civiora_Report_CIV-12345.json');

    // RFC 5987 UTF-8 encoded filename*
    const h4 = "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''Civiora_Report_CIV-12345.pdf";
    expect(parseContentDispositionFilename(h4)).toBe('Civiora_Report_CIV-12345.pdf');

    // Resolution document header
    const h5 = 'attachment; filename="Civiora_Resolution_CIV-12345_v2.pdf"';
    expect(parseContentDispositionFilename(h5)).toBe('Civiora_Resolution_CIV-12345_v2.pdf');

    // Null or empty handling
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename('')).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PDF generation produces genuine PDF bytes
  // ─────────────────────────────────────────────────────────────
  it('5. should generate valid binary PDF bytes starting with %PDF- and ending with %%EOF', async () => {
    const dto = buildIncidentReportDTO(mockIncident);
    const incidentPdf = await generateIncidentPdf(dto);

    expect(Buffer.isBuffer(incidentPdf)).toBe(true);
    expect(incidentPdf.length).toBeGreaterThan(4000);
    expect(incidentPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(incidentPdf.subarray(incidentPdf.length - 128).toString('ascii')).toContain('%%EOF');

    // Final resolution PDF
    const resPdf = await generateResolutionPdf({
      incidentNumber: mockIncident.incidentNumber,
      title: mockIncident.title,
      categoryLabel: mockIncident.category,
      locationAddress: mockIncident.location.address,
      coordinates: mockIncident.location.coordinates as [number, number],
      submittedAt: mockIncident.createdAt,
      resolvedAt: mockIncident.resolution.resolvedAt,
      startedAt: mockResolutionDoc.startedAt,
      completedAt: mockResolutionDoc.completedAt,
      elapsedSeconds: mockResolutionDoc.totalDurationSeconds,
      activeWorkSeconds: mockResolutionDoc.activeDurationSeconds,
      workerName: mockResolutionDoc.workerName,
      verifierName: mockResolutionDoc.verifierName,
      verifierRole: 'DEPARTMENT OFFICER',
      departmentName: mockResolutionDoc.departmentName,
      completionSummary: mockResolutionDoc.completionSummary,
      inspectionNotes: mockResolutionDoc.inspectionNotes,
      resolutionId: mockResolutionDoc.resolutionId,
      version: mockResolutionDoc.version,
      contentHash: mockResolutionDoc.contentHash,
    });

    expect(Buffer.isBuffer(resPdf)).toBe(true);
    expect(resPdf.length).toBeGreaterThan(3000);
    expect(resPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(resPdf.subarray(resPdf.length - 128).toString('ascii')).toContain('%%EOF');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. TXT generation produces readable text
  // ─────────────────────────────────────────────────────────────
  it('6. should generate clean, human-readable plain text reports', () => {
    const dto = buildIncidentReportDTO(mockIncident);
    const txt = generateTxtExport(dto);

    expect(typeof txt).toBe('string');
    expect(txt).toContain('CIVIORA CIVIC INTELLIGENCE DOSSIER');
    expect(txt).toContain('CIV-12345');
    expect(txt).toContain('Mount Road');
    expect(txt).toContain('Asphalt Fissure');

    // Resolution TXT export
    const resTxt = generateResolutionTxtExport(mockResolutionDoc, mockIncident);
    expect(typeof resTxt).toBe('string');
    expect(resTxt).toContain('CIVIORA MUNICIPAL RESOLUTION DOSSIER');
    expect(resTxt).toContain('RES-CIV-12345-V1');
    expect(resTxt).toContain('VERIFIED & CLOSED');
    expect(resTxt).toContain('Murugan S');
  });

  // ─────────────────────────────────────────────────────────────
  // 7. JSON export parses cleanly and contains structured data
  // ─────────────────────────────────────────────────────────────
  it('7. should generate parseable JSON exports matching the schema', () => {
    const dto = buildIncidentReportDTO(mockIncident);
    const jsonStr = generateJsonExport(dto);

    const parsed = JSON.parse(jsonStr);
    expect(parsed.incidentNumber).toBe('CIV-12345');
    expect(parsed.title).toContain('Severe Asphalt Fissure');
    expect(parsed.location.coordinates).toEqual([13.06, 80.25]);

    // Resolution JSON export
    const resJsonStr = generateResolutionJsonExport(mockResolutionDoc, mockIncident);
    const resParsed = JSON.parse(resJsonStr);
    expect(resParsed.documentType).toBe('CIVIORA_FINAL_RESOLUTION_DOSSIER');
    expect(resParsed.resolutionId).toBe('RES-CIV-12345-V1');
    expect(resParsed.status).toBe('approved');
    expect(resParsed.verificationChecksum).toBe(mockResolutionDoc.contentHash);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. CSV export conforms to RFC-4180
  // ─────────────────────────────────────────────────────────────
  it('8. should generate valid RFC-4180 compliant CSV exports with properly quoted fields', () => {
    const dto = buildIncidentReportDTO(mockIncident);
    const csv = generateCsvExport(dto);

    expect(typeof csv).toBe('string');
    const lines = csv.split('\r\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(2); // Header row + 1 data row

    expect(lines[0]).toContain('"Incident Reference","Civic Category"');
    expect(lines[1]).toContain('"CIV-12345"');
    expect(lines[1]).toContain('"Mount Road, Thousand Lights, Chennai, Tamil Nadu"');

    // Resolution CSV export
    const resCsv = generateResolutionCsvExport(mockResolutionDoc, mockIncident);
    const resLines = resCsv.split('\r\n').filter((l) => l.trim().length > 0);
    expect(resLines.length).toBe(2);
    expect(resLines[0]).toContain('"Resolution Reference","Incident Reference"');
    expect(resLines[1]).toContain('"RES-CIV-12345-V1"');
    expect(resLines[1]).toContain('"Murugan S"');
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Unsupported export formats rejected (no silent fallback)
  // ─────────────────────────────────────────────────────────────
  it('9. should ensure only implemented formats are supported and invalid formats are rejected', () => {
    const validFormats: ReportFormat[] = ['pdf', 'txt', 'json', 'csv'];
    const invalidFormats = ['docx', 'zip', 'xlsx', 'html', 'tar', 'unknown'];

    validFormats.forEach((fmt) => {
      expect(REPORT_FORMAT_SPECS[fmt]).toBeDefined();
    });

    invalidFormats.forEach((fmt) => {
      expect((REPORT_FORMAT_SPECS as any)[fmt]).toBeUndefined();
    });
  });
});
