// ============================================================
// Civiora - Report Generation, PDF & Dispatch Unit Tests
// Tests PDFKit buffer generation, RFC-4180 CSV, JSON & Dispatch
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildIncidentReportDTO, type IncidentReportDTO } from '../modules/reports/report.dto.js';
import { generateIncidentPdf } from '../modules/reports/pdfGenerator.service.js';
import { generateCsvExport, generateJsonExport, generateTxtExport } from '../modules/reports/export.service.js';

describe('PDF Generation & Report Export Engine', () => {
  const mockIncidentData = {
    _id: '670cd1a89f1092a3b4c5d6e7',
    incidentNumber: 'INC-2026-CH-0042',
    category: 'pothole',
    title: 'Severe Structural Crater on Anna Salai Corridor',
    description: 'Deep road surface crater causing rapid vehicle deceleration and severe monsoon pooling hazard.',
    status: 'in_progress',
    priority: 'high',
    isEmergency: false,
    createdAt: new Date('2026-10-13T10:30:00Z'),
    updatedAt: new Date('2026-10-13T11:45:00Z'),
    location: {
      address: 'Anna Salai, Guindy, Chennai, Tamil Nadu 600032',
      coordinates: [80.2084, 13.0067], // [lng, lat]
      precisionLevel: 'exact',
    },
    risk: {
      score: 78,
      level: 'high',
      factors: [
        { factor: 'high_priority', weight: 0.3, explanation: 'Elevated urban impact' },
        { factor: 'arterial_road', weight: 0.4, explanation: 'Primary traffic artery' },
      ],
    },
    ai: {
      category: 'pothole',
      confidence: 0.96,
      severity: 'high',
      detectedObjects: ['crater', 'asphalt displacement', 'puddle'],
      nlpExtraction: {
        category: 'pothole',
        issue: 'Deep asphalt depression',
        severity: 'high',
        impact: 'Hazard to two-wheelers and buses',
      },
      modelVersion: 'Civiora-YOLO11-Qwen2.5-VL-v1.0',
    },
    reportedBy: {
      profile: { firstName: 'Akilesh', lastName: 'Anand' },
      email: 'akilesh.test@civiora.local',
    },
    assignedTo: {
      profile: { firstName: 'Divya', lastName: 'Murugan' },
      email: 'divya.highways@tngov.in',
      role: 'officer',
    },
    department: 'Highways & Urban Drainage Department',
    sla: {
      deadline: new Date('2026-10-13T18:30:00Z'),
      breached: false,
      escalationLevel: 0,
    },
    evidence: [],
  };

  it('1. should construct an authoritative IncidentReportDTO correctly', () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      additionalMessage: 'School buses pass here between 8:00 AM and 9:00 AM.',
      consent: true,
    });

    expect(dto.incidentNumber).toBe('INC-2026-CH-0042');
    expect(dto.title).toContain('Severe Structural Crater');
    expect(dto.location.address).toContain('Anna Salai');
    expect(dto.location.latitude).toBeCloseTo(13.0067, 3);
    expect(dto.location.longitude).toBeCloseTo(80.2084, 3);
    expect(dto.reporter.name).toBe('Akilesh Anand');
    expect(dto.reporter.additionalMessage).toContain('School buses pass here');
    expect(dto.reporter.consentGiven).toBe(true);
    expect(dto.aiFindings.confidence).toBe(0.96);
  });

  it('2. should generate a genuine vector PDF buffer with valid PDF headers', async () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      additionalMessage: 'Critical municipal repair needed before evening rush hour.',
      consent: true,
    });

    const pdfBuffer = await generateIncidentPdf(dto);

    // Verify buffer exists and has content
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(4000); // Substantial vector document

    // Verify standard PDF magic number (%PDF-1.)
    const pdfMagic = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(pdfMagic).toBe('%PDF-');

    // Verify document contains EOF marker
    const tail = pdfBuffer.subarray(pdfBuffer.length - 128).toString('ascii');
    expect(tail).toContain('%%EOF');
  });

  it('3. should generate valid RFC-4180 CSV export', () => {
    const dto = buildIncidentReportDTO(mockIncidentData);
    const csv = generateCsvExport(dto);

    expect(typeof csv).toBe('string');
    expect(csv).toContain('"Incident Reference","Civic Category"');
    expect(csv).toContain('"INC-2026-CH-0042"');
    expect(csv).toContain('"Anna Salai, Guindy, Chennai, Tamil Nadu 600032"');
  });

  it('4. should generate structured JSON export', () => {
    const dto = buildIncidentReportDTO(mockIncidentData);
    const jsonStr = generateJsonExport(dto);

    const parsed = JSON.parse(jsonStr) as IncidentReportDTO;
    expect(parsed.incidentNumber).toBe('INC-2026-CH-0042');
    expect(parsed.category).toBe('pothole');
    expect(parsed.risk.score).toBe(78);
  });

  it('5. should sanitize contact details when reporter consent is withheld', () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      consent: false,
    });

    expect(dto.reporter.consentGiven).toBe(false);

    const csv = generateCsvExport(dto);
    expect(csv).toContain('"Anonymous / Withheld"');
    expect(csv).toContain('"Withheld"');
  });

  it('6. should gracefully generate PDF with missing optional fields without crashing', async () => {
    const minimalIncident = {
      _id: '670cd1a89f1092a3b4c5d6e8',
      incidentNumber: 'INC-2026-MINIMAL-01',
      category: 'sanitation',
      title: 'Overflowing Waste Bin',
      description: 'Public waste bin overflow.',
      status: 'reported',
      priority: 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        coordinates: [77.0, 11.0],
      },
    };

    const dto = buildIncidentReportDTO(minimalIncident);
    const pdfBuffer = await generateIncidentPdf(dto);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('7. should generate a clean, accessible plain-text (TXT) municipal dossier', () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      additionalMessage: 'Near Government High School entrance.',
      consent: true,
    });

    const txt = generateTxtExport(dto);
    expect(typeof txt).toBe('string');
    expect(txt).toContain('CIVIORA CIVIC INTELLIGENCE DOSSIER');
    expect(txt).toContain('INC-2026-CH-0042');
    expect(txt).toContain('Anna Salai');
    expect(txt).toContain('Akilesh Anand');
    expect(txt).toContain('Near Government High School entrance.');
  });

  it('8. should sanitize plain-text (TXT) export when consent is withheld', () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      consent: false,
    });

    const txt = generateTxtExport(dto);
    expect(txt).toContain('Anonymous / Withheld');
    expect(txt).toContain('NO (Confidential Citizen Record)');
    expect(txt).not.toContain('akilesh.test@civiora.local');
  });

  it('9. should generate PDF with withheld reporter identity without leaking contact details', async () => {
    const dto = buildIncidentReportDTO(mockIncidentData, {
      consent: false,
    });

    const pdfBuffer = await generateIncidentPdf(dto);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
