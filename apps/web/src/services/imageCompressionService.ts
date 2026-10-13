// ============================================================
// Civiora In-Browser Image Optimization & Compression Service
// High-efficiency Web Worker compression for mobile camera frames
// Reduces 10MB+ smartphone photos down to lightweight ~400-800KB payloads
// ============================================================

import imageCompression from 'browser-image-compression';

export interface ImageOptimizationResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  width?: number;
  height?: number;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1.2,
  maxWidthOrHeight: 1920,
  initialQuality: 0.85,
  useWebWorker: true,
};

/**
 * Optimizes an uploaded image file before network transmission.
 * Preserves visual evidence clarity for YOLO11 AI while eliminating
 * mobile upload latency and bandwidth bottlenecks.
 */
export async function optimizeImageForUpload(
  file: File,
  customOptions?: CompressionOptions
): Promise<ImageOptimizationResult> {
  const originalSizeBytes = file.size;

  // If already under 800KB and reasonable format, skip recompression
  if (originalSizeBytes < 800 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      reductionPercentage: 0,
    };
  }

  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type || 'image/jpeg',
      lastModified: Date.now(),
    });

    const compressedSizeBytes = compressedFile.size;
    const reductionPercentage = Math.round(
      ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100
    );

    return {
      file: compressedFile,
      originalSizeBytes,
      compressedSizeBytes,
      reductionPercentage: Math.max(0, reductionPercentage),
    };
  } catch (err) {
    console.warn('[Civiora Image Optimizer] Compression fallback to original file:', err);
    // Graceful fallback: return original file intact
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      reductionPercentage: 0,
    };
  }
}
