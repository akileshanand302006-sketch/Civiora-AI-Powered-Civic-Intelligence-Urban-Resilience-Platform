// ============================================================
// Civiora AI Backend Service
// Connects Node.js Backend to Python Multi-Model AI Service
// Persists Results into MongoDB Atlas (AIInference Collection)
// ============================================================

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AIInference, type IAIInference } from './aiInference.model.js';
import mongoose from 'mongoose';

export interface UnifiedAIAnalysisResult {
  success: boolean;
  data?: {
    image_metadata: {
      filename: string;
      dimensions: [number, number];
      quality: {
        blur_level: string;
        lighting: string;
        sufficient_resolution: boolean;
      };
    };
    primary_category: string;
    overall_confidence: number;
    recommended_severity: string;
    stages: {
      detector_yolo11: {
        model_version: string;
        dominant_category: string;
        confidence: number;
        detected_count: number;
        detections: Array<{
          raw_label: string;
          canonical_category: string;
          confidence: number;
          box: {
            x_min: number;
            y_min: number;
            x_max: number;
            y_max: number;
            width: number;
            height: number;
          };
        }>;
        latency_ms: number;
      };
      ocr_text?: {
        model_version: string;
        full_text: string;
        token_count: number;
        confidence: number;
        emergency_indicators: string[];
        latency_ms: number;
      };
      qwen2_5_vl?: {
        model_version: string;
        structured_output: {
          image_description: string;
          possible_civic_category: string;
          visible_evidence: string[];
          relevant_objects_and_conditions: string[];
          potential_obstruction_or_safety_concerns: string[];
          uncertainty_score: number;
          recommended_followup: string;
          requires_human_review: boolean;
        };
        latency_ms: number;
      };
      clip_embeddings?: {
        model_version: string;
        dimensions: number;
        embedding: number[];
        latency_ms: number;
      };
      segmentation_damage?: {
        model_version: string;
        segments_count: number;
        total_damage_coverage_pct: number;
        severity_assessment: string;
        segments: Array<{
          segment_id: number;
          label: string;
          confidence: number;
          polygon_points: [number, number][];
          estimated_coverage_percentage: number;
        }>;
        latency_ms: number;
      };
    };
    total_pipeline_latency_ms: number;
    human_review_required: boolean;
    review_reasons: string[];
  };
  error?: string;
}

export class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.AI_SERVICE_URL.replace(/\/+$/, '');
  }

  /**
   * Fetch readiness and metadata for all 5 model families from Python AI Service.
   */
  async getModelsMetadata(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/models`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      const body = (await response.json()) as { success: boolean; data: Record<string, unknown> };
      return body.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`AI Service metadata request failed: ${msg}. Returning offline summary.`);
      return {
        online: false,
        error: msg,
        models: {
          yolo11: { family: 'YOLO11', available: true, status: 'offline_or_connecting' },
          ocr: { family: 'PaddleOCR', available: true, status: 'offline_or_connecting' },
          qwen2_5_vl: { family: 'Qwen2.5-VL', available: true, status: 'offline_or_connecting' },
          clip: { family: 'CLIP', available: true, status: 'offline_or_connecting' },
          segmentation: { family: 'YOLO11-seg', available: true, status: 'offline_or_connecting' },
        },
      };
    }
  }

  /**
   * Forward uploaded image buffer to Python AI Service for unified multimodal analysis.
   */
  async analyzeImageBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string = 'image/jpeg'
  ): Promise<UnifiedAIAnalysisResult> {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, filename);
      formData.append('include_ocr', 'true');
      formData.append('include_qwen', 'true');
      formData.append('include_clip', 'true');
      formData.append('include_segmentation', 'true');

      const response = await fetch(`${this.baseUrl}/api/v1/ai/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as UnifiedAIAnalysisResult;
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`AI Image Analysis failed: ${msg}`);
      return {
        success: false,
        error: `AI analysis service error: ${msg}`,
      };
    }
  }

  /**
   * Persist AI Analysis results into MongoDB Atlas AIInference collection.
   */
  async saveInferenceToDatabase(
    incidentId: string | mongoose.Types.ObjectId,
    organizationId: string | mongoose.Types.ObjectId,
    analysis: UnifiedAIAnalysisResult['data'],
    evidenceId?: string | mongoose.Types.ObjectId
  ): Promise<IAIInference | null> {
    if (!analysis) return null;

    try {
      const bboxes = (analysis.stages.detector_yolo11?.detections || []).map((d) => ({
        x: d.box.x_min,
        y: d.box.y_min,
        w: d.box.width,
        h: d.box.height,
        label: d.canonical_category,
        confidence: d.confidence,
      }));

      const detectedObjs = (analysis.stages.detector_yolo11?.detections || []).map(
        (d) => d.canonical_category
      );

      const qwenStruct = analysis.stages.qwen2_5_vl?.structured_output;

      const inferenceDoc = await AIInference.create({
        incidentId: new mongoose.Types.ObjectId(incidentId.toString()),
        organizationId: new mongoose.Types.ObjectId(organizationId.toString()),
        evidenceId: evidenceId ? new mongoose.Types.ObjectId(evidenceId.toString()) : undefined,
        modelName: 'Civiora-Multimodal-Pipeline',
        modelVersion: '1.0.0 (YOLO11+PaddleOCR+Qwen2.5-VL+CLIP+YOLO11-seg)',
        detectedCategory: analysis.primary_category || 'other',
        confidence: analysis.overall_confidence || 0.0,
        detectedObjects: detectedObjs,
        boundingBoxes: bboxes,
        nlpSummary: qwenStruct
          ? {
              issue: qwenStruct.image_description || '',
              severity: analysis.recommended_severity || 'medium',
              impact: (qwenStruct.potential_obstruction_or_safety_concerns || []).join('; '),
              potentialRisk: (qwenStruct.visible_evidence || []).join('; '),
            }
          : undefined,
        processingDurationMs: analysis.total_pipeline_latency_ms || 0,
        metadata: {
          ocr_text: analysis.stages.ocr_text?.full_text || '',
          ocr_emergency_keywords: analysis.stages.ocr_text?.emergency_indicators || [],
          damage_coverage_pct:
            analysis.stages.segmentation_damage?.total_damage_coverage_pct || 0,
          segmentation_polygons_count:
            analysis.stages.segmentation_damage?.segments_count || 0,
          uncertainty_score: qwenStruct?.uncertainty_score || 0,
          human_review_required: analysis.human_review_required,
          review_reasons: analysis.review_reasons,
        },
      });

      logger.info(
        `AI Inference record persisted in MongoDB Atlas for Incident ${incidentId} (ID: ${inferenceDoc.id})`
      );
      return inferenceDoc;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to persist AI inference to MongoDB Atlas: ${msg}`);
      return null;
    }
  }

  /**
   * Rank candidate incidents using CLIP embeddings and geospatial distance.
   */
  async findSimilarIncidents(payload: {
    query_category: string;
    query_coordinates: [number, number];
    query_embedding?: number[];
    candidates: Array<Record<string, unknown>>;
    geo_radius_meters?: number;
    similarity_threshold?: number;
  }): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/find-similar-incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned ${response.status}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Candidate duplicate search failed: ${msg}`);
      return { success: false, error: msg };
    }
  }
}

export const aiService = new AIService();
