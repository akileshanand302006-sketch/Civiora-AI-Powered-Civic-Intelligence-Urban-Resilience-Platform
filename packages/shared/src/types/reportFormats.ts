// ============================================================
// Civiora — Standard Report Format & File Download Definitions
// Authoritative MIME types, safe filename sanitization, and specs
// ============================================================

export type ReportFormat = 'pdf' | 'txt' | 'json' | 'csv';
export type DocumentKind = 'incident' | 'resolution';

export interface ReportFormatSpec {
  format: ReportFormat;
  extension: `.${string}`;
  mimeType: string;
  label: string;
  isBinary: boolean;
}

export const REPORT_FORMAT_SPECS: Record<ReportFormat, ReportFormatSpec> = {
  pdf: {
    format: 'pdf',
    extension: '.pdf',
    mimeType: 'application/pdf',
    label: 'Official PDF Document',
    isBinary: true,
  },
  txt: {
    format: 'txt',
    extension: '.txt',
    mimeType: 'text/plain; charset=utf-8',
    label: 'Plain Text Dossier',
    isBinary: false,
  },
  json: {
    format: 'json',
    extension: '.json',
    mimeType: 'application/json; charset=utf-8',
    label: 'Structured JSON',
    isBinary: false,
  },
  csv: {
    format: 'csv',
    extension: '.csv',
    mimeType: 'text/csv; charset=utf-8',
    label: 'Tabular CSV',
    isBinary: false,
  },
};

/**
 * Sanitizes an incident number or ID to prevent path traversal and unsafe filename characters.
 */
export function sanitizeReportFilenameId(idOrNumber: string | undefined | null): string {
  if (!idOrNumber) return 'CIV-UNKNOWN';
  // Strip control chars, directory traversal, and non-safe symbols
  const cleaned = String(idOrNumber)
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'CIV-UNKNOWN';
}

/**
 * Generates an authoritative filename for reports and resolution documents:
 * e.g.:
 *   Civiora_Report_CP-2026-ABCD.pdf
 *   Civiora_Report_CP-2026-ABCD.csv
 *   Civiora_Report_CP-2026-ABCD.json
 *   Civiora_Report_CP-2026-ABCD.txt
 *   Civiora_Resolution_CP-2026-ABCD.pdf
 *   Civiora_Resolution_CP-2026-ABCD_v2.pdf
 */
export function generateReportFilename(
  kind: DocumentKind,
  referenceId: string,
  format: ReportFormat,
  version?: number
): string {
  const safeRef = sanitizeReportFilenameId(referenceId);
  const spec = REPORT_FORMAT_SPECS[format] || REPORT_FORMAT_SPECS.pdf;
  const prefix = kind === 'resolution' ? 'Civiora_Resolution' : 'Civiora_Report';
  const versionSuffix = kind === 'resolution' && version && version > 1 ? `_v${version}` : '';
  return `${prefix}_${safeRef}${versionSuffix}${spec.extension}`;
}

/**
 * Parses the filename safely from a standard HTTP Content-Disposition header.
 * Handles both standard quoted filename and RFC 5987 UTF-8 encoded filename* parameters.
 */
export function parseContentDispositionFilename(header: string | null | undefined): string | null {
  if (!header) return null;

  // 1. Check for RFC 5987 filename*=UTF-8''... parameter
  const utf8Match = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
      if (decoded) return decoded.replace(/[/\\?%*:|"<>]/g, '_');
    } catch {
      // Fallback to standard filename parameter
    }
  }

  // 2. Check for standard filename="..." or filename=...
  const match = header.match(/filename\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s;]+))/i);
  if (match) {
    const raw = match[1] || match[2] || match[3];
    if (raw) {
      return raw.trim().replace(/^["']|["']$/g, '').replace(/[/\\?%*:|"<>]/g, '_');
    }
  }

  return null;
}
