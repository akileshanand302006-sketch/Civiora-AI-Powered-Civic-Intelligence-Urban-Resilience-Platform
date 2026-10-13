// ============================================================
// Civiora AI Routes
// Fast, Type-Safe Endpoints for Multimodal AI Services
// ============================================================

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { aiController } from './ai.controller.js';

const router = Router();

// Configure in-memory upload storage with file verification
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'));
    }
  },
});

/**
 * GET /api/v1/ai/models
 * Public/Authenticated endpoint for model readiness and storage budget report.
 */
router.get('/models', (req: Request, res: Response) => aiController.getModelsStatus(req, res));

/**
 * POST /api/v1/ai/analyze-image
 * Authenticated endpoint for end-to-end multimodal image analysis.
 * Supports YOLO11, OCR, Qwen2.5-VL, CLIP, and YOLO11-seg.
 */
router.post(
  '/analyze-image',
  upload.single('file'),
  (req: Request, res: Response) => aiController.analyzeImage(req, res)
);

/**
 * POST /api/v1/ai/find-similar-incidents
 * Evaluates duplicate candidate incidents based on visual embeddings and location.
 */
router.post(
  '/find-similar-incidents',
  (req: Request, res: Response) => aiController.findSimilarIncidents(req, res)
);

export default router;
