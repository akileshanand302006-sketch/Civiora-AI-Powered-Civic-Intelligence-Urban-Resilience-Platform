// ============================================================
// Civiora AI Controller
// Endpoints for Multimodal Image Analysis, Models Metadata,
// and Semantic Duplicate Candidate Retrieval
// ============================================================

import type { Request, Response } from 'express';
import { aiService } from './ai.service.js';
import { logger } from '../../utils/logger.js';

export class AIController {
  /**
   * GET /api/v1/ai/models
   * Returns readiness and metadata for all 5 model families.
   */
  async getModelsStatus(_req: Request, res: Response): Promise<void> {
    try {
      const data = await aiService.getModelsMetadata();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Error fetching AI models status: ${msg}`);
      res.status(500).json({
        success: false,
        error: { code: 'AI_METADATA_ERROR', message: msg },
      });
    }
  }

  /**
   * POST /api/v1/ai/analyze-image
   * Accepts image file, runs 5-model pipeline, and saves inference in MongoDB Atlas.
   */
  async analyzeImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'No image file was uploaded for analysis.' },
        });
        return;
      }

      // 1. Execute Unified 5-Model Multimodal Analysis
      const analysis = await aiService.analyzeImageBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (!analysis.success || !analysis.data) {
        res.status(502).json({
          success: false,
          error: {
            code: 'AI_INFERENCE_FAILED',
            message: analysis.error || 'AI multimodal inference failed.',
          },
        });
        return;
      }

      // 2. Persist in MongoDB Atlas if incident / organization IDs provided
      const { incidentId, organizationId, evidenceId } = req.body;
      let savedInferenceId: string | null = null;

      if (incidentId && organizationId) {
        const doc = await aiService.saveInferenceToDatabase(
          incidentId,
          organizationId,
          analysis.data,
          evidenceId
        );
        if (doc) {
          savedInferenceId = doc.id;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          ...analysis.data,
          saved_inference_id: savedInferenceId,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`AI analyzeImage handler error: ${msg}`);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_AI_ERROR', message: msg },
      });
    }
  }

  /**
   * POST /api/v1/ai/find-similar-incidents
   * Evaluates duplicate candidates using visual CLIP embeddings and geodesic proximity.
   */
  async findSimilarIncidents(req: Request, res: Response): Promise<void> {
    try {
      const {
        query_category,
        query_coordinates,
        query_embedding,
        candidates,
        geo_radius_meters,
        similarity_threshold,
      } = req.body;

      if (!query_category || !query_coordinates) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'query_category and query_coordinates are required.',
          },
        });
        return;
      }

      const result = await aiService.findSimilarIncidents({
        query_category,
        query_coordinates,
        query_embedding,
        candidates: candidates || [],
        geo_radius_meters: geo_radius_meters || 300.0,
        similarity_threshold: similarity_threshold || 0.65,
      });

      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`AI findSimilarIncidents error: ${msg}`);
      res.status(500).json({
        success: false,
        error: { code: 'DUPLICATE_SEARCH_ERROR', message: msg },
      });
    }
  }
}

export const aiController = new AIController();
