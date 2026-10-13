// ============================================================
// Civiora — Frontend Report Download Utility Unit Tests
// Verifies format passing, Content-Disposition parsing, MIME preservation,
// error text extraction from Blob payloads, and URL revocation.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadReportFile,
  extractBlobErrorMessage,
} from '../utils/downloadReport';
import { api } from '../services/api';

describe('Frontend Report Download Utility', () => {
  let mockAnchor: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockAnchor = {
      href: '',
      download: '',
      style: {},
      click: vi.fn(),
      parentNode: null,
    };

    (globalThis as any).window = {
      URL: {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      },
    };

    (globalThis as any).document = {
      body: {
        appendChild: vi.fn((node: any) => {
          node.parentNode = (globalThis as any).document.body;
          return node;
        }),
        removeChild: vi.fn((node: any) => {
          node.parentNode = null;
          return node;
        }),
      },
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') return mockAnchor;
        return {};
      }),
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Error extraction from Blob error payloads
  // ─────────────────────────────────────────────────────────────
  it('1. should extract readable JSON error messages from Axios blob error responses', async () => {
    const errorJson = JSON.stringify({
      success: false,
      error: { message: 'Incident is not resolved yet or resolution dossier has not been approved.' },
    });

    const mockBlob = new Blob([errorJson], { type: 'application/json' });
    const axiosError = {
      response: {
        status: 400,
        data: mockBlob,
      },
      message: 'Request failed with status code 400',
    };

    const message = await extractBlobErrorMessage(axiosError);
    expect(message).toBe('Incident is not resolved yet or resolution dossier has not been approved.');
  });

  it('2. should fall back cleanly when error blob is not JSON', async () => {
    const rawText = '502 Bad Gateway - Upstream Server Error';
    const mockBlob = new Blob([rawText], { type: 'text/html' });
    const axiosError = {
      response: {
        status: 502,
        data: mockBlob,
      },
      message: 'Request failed with status code 502',
    };

    const message = await extractBlobErrorMessage(axiosError);
    expect(message).toBe(rawText);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Download trigger and URL revocation
  // ─────────────────────────────────────────────────────────────
  it('3. should pass explicit format parameter and trigger download with server Content-Disposition filename', async () => {
    const mockPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]); // %PDF-1.
    const mockBlob = new Blob([mockPdfBytes], { type: 'application/pdf' });

    let capturedEndpoint = '';
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      capturedEndpoint = url;
      return {
        status: 200,
        data: mockBlob,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="Civiora_Report_CIV-12345.pdf"',
        },
      } as any;
    });

    const result = await downloadReportFile({
      kind: 'incident',
      incidentIdOrNumber: 'CIV-12345',
      format: 'pdf',
    });

    expect(capturedEndpoint).toContain('/incidents/CIV-12345/report/export?format=pdf');
    expect(result.success).toBe(true);
    expect(result.filename).toBe('Civiora_Report_CIV-12345.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(mockAnchor.download).toBe('Civiora_Report_CIV-12345.pdf');
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect((globalThis as any).window.URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Wait for revocation timeout
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect((globalThis as any).window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Fallback filename with format extension
  // ─────────────────────────────────────────────────────────────
  it('4. should construct format-specific fallback filename when server omits header', async () => {
    const csvContent = '"Incident Reference","Category"\r\n"CIV-999","Pothole"';
    const mockBlob = new Blob([csvContent], { type: 'text/csv' });

    vi.spyOn(api, 'get').mockResolvedValue({
      status: 200,
      data: mockBlob,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        // Server header missing
      },
    });

    const result = await downloadReportFile({
      kind: 'incident',
      incidentIdOrNumber: 'CIV-999',
      format: 'csv',
    });

    expect(result.filename).toBe('Civiora_Report_CIV-999.csv');
    expect(result.filename.endsWith('.csv')).toBe(true);
    expect(mockAnchor.download).toBe('Civiora_Report_CIV-999.csv');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Distinction between incident and resolution download calls
  // ─────────────────────────────────────────────────────────────
  it('5. should route resolution downloads to resolution endpoint and preserve resolution filename', async () => {
    let capturedEndpoint = '';
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      capturedEndpoint = url;
      return {
        status: 200,
        data: new Blob(['{"resolved": true}'], { type: 'application/json' }),
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': 'attachment; filename="Civiora_Resolution_CIV-12345.json"',
        },
      } as any;
    });

    const result = await downloadReportFile({
      kind: 'resolution',
      incidentIdOrNumber: 'CIV-12345',
      format: 'json',
    });

    expect(capturedEndpoint).toContain('/incidents/CIV-12345/resolution/export?format=json');
    expect(result.filename).toBe('Civiora_Resolution_CIV-12345.json');
    expect(result.filename.startsWith('Civiora_Resolution_')).toBe(true);
    expect(mockAnchor.download).toBe('Civiora_Resolution_CIV-12345.json');
  });
});
