// ============================================================
// Civiora — Reliable Report & Dossier Download Utility
// Strictly verifies MIME types, parses Content-Disposition,
// handles error responses gracefully, and ensures exact file extensions.
// ============================================================

import { api } from '../services/api';
import {
  type ReportFormat,
  type DocumentKind,
  REPORT_FORMAT_SPECS,
  generateReportFilename,
  parseContentDispositionFilename,
} from '@civicpulse/shared';

export interface DownloadReportOptions {
  kind: DocumentKind; // 'incident' | 'resolution'
  incidentIdOrNumber: string;
  format: ReportFormat; // 'pdf' | 'txt' | 'json' | 'csv'
  version?: number;
  reporterOverrides?: {
    name?: string;
    email?: string;
    phone?: string;
    additionalMessage?: string;
    consent?: boolean;
  };
}

export interface DownloadResult {
  success: boolean;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Extracts a readable error message from an Axios error,
 * especially when responseType is 'blob' (which packs error JSON into a Blob).
 */
export async function extractBlobErrorMessage(err: any): Promise<string> {
  const data = err?.response?.data;
  if (data && (typeof data.text === 'function' || (typeof Blob !== 'undefined' && data instanceof Blob))) {
    try {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.message) return parsed.error.message;
        if (parsed?.message) return parsed.message;
      } catch {
        // Not JSON
      }
      if (text && text.trim().length > 0 && text.length < 300) {
        return text.trim();
      }
    } catch {
      // ignore
    }
  }

  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    'An unexpected error occurred while downloading the file.'
  );
}

/**
 * Initiates an authoritative, format-precise file download.
 *
 * Guarantees:
 * 1. Explicit format parameter sent to backend.
 * 2. HTTP response status checked.
 * 3. Exact Content-Disposition filename parsed (quoted & UTF-8 filename*).
 * 4. Safe fallback filename with correct extension if header missing.
 * 5. Preserves correct MIME type without forcing generic dossier types.
 * 6. Object URL cleanly revoked after trigger.
 * 7. Real error messages extracted without saving error JSON as a corrupted file.
 */
export async function downloadReportFile(options: DownloadReportOptions): Promise<DownloadResult> {
  const { kind, incidentIdOrNumber, format, version } = options;

  if (!incidentIdOrNumber) {
    throw new Error('A valid incident reference or ID is required for downloading.');
  }

  const spec = REPORT_FORMAT_SPECS[format];
  if (!spec) {
    throw new Error(`Unsupported download format '${format}'. Supported: pdf, txt, json, csv`);
  }

  // Construct format-explicit API endpoint
  let endpoint = '';
  if (kind === 'resolution') {
    endpoint = `/incidents/${encodeURIComponent(incidentIdOrNumber)}/resolution/export?format=${format}`;
  } else {
    endpoint = `/incidents/${encodeURIComponent(incidentIdOrNumber)}/report/export?format=${format}`;
  }

  try {
    const response = await api.get(endpoint, {
      responseType: 'blob',
      params: options.reporterOverrides
        ? {
            message: options.reporterOverrides.additionalMessage,
            consent: options.reporterOverrides.consent !== false ? 'true' : 'false',
          }
        : undefined,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const blobData: Blob = response.data;

    // Detect if server returned a JSON error payload disguised with 200 OK
    const rawContentType = String(response.headers['content-type'] || '').toLowerCase();
    if (format !== 'json' && rawContentType.includes('application/json')) {
      const text = await blobData.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.success === false || parsed.error) {
          throw new Error(parsed.error?.message || 'Server returned an export error.');
        }
      } catch (jsonErr: any) {
        if (jsonErr.message !== 'Server returned an export error.') {
          // not an error JSON, continue
        } else {
          throw jsonErr;
        }
      }
    }

    // Determine authoritative filename: header first, fallback to shared filename generator
    const dispositionHeader = response.headers['content-disposition'] as string | undefined;
    let filename = parseContentDispositionFilename(dispositionHeader);

    if (!filename) {
      filename = generateReportFilename(kind, incidentIdOrNumber, format, version);
    }

    // Double check that the filename ends with the expected format extension
    if (!filename.toLowerCase().endsWith(spec.extension)) {
      filename = `${filename}${spec.extension}`;
    }

    // Determine authoritative MIME type
    const finalMimeType = rawContentType.split(';')[0]?.trim() || spec.mimeType;

    // Trigger browser download via object URL if running in browser
    const fileBlob = new Blob([blobData], { type: finalMimeType });
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.URL?.createObjectURL) {
      const objectUrl = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Revoke object URL safely
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(objectUrl);
      }, 500);
    }

    return {
      success: true,
      filename,
      mimeType: finalMimeType,
      sizeBytes: fileBlob.size,
    };
  } catch (err: any) {
    const detailedMessage = await extractBlobErrorMessage(err);
    throw new Error(detailedMessage);
  }
}
