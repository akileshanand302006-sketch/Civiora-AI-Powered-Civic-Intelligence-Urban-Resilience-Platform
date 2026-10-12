import React from 'react';
import { GlassPanel } from './GlassPanel';
import type { AIAnalysis } from '@civicpulse/shared';

export interface AIProcessingPanelProps {
  analysis?: AIAnalysis;
  isProcessing?: boolean;
}

export const AIProcessingPanel: React.FC<AIProcessingPanelProps> = ({
  analysis,
  isProcessing = false,
}) => {
  if (isProcessing) {
    return (
      <GlassPanel glow className="p-4 text-center">
        <div className="position-relative d-inline-block mb-3">
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid var(--cp-accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: 'var(--cp-accent-cyan)',
            }}
            className="animate-pulse-cyan"
          >
            <i className="bi bi-cpu" />
          </div>
        </div>
        <h6 className="fw-bold mb-1" style={{ color: 'var(--cp-accent-cyan)' }}>
          CivicPulse Neural Vision Active
        </h6>
        <p className="text-secondary small mb-0">
          Running YOLOv8 inference, semantic NLP classification & duplicate clustering...
        </p>
      </GlassPanel>
    );
  }

  if (!analysis) return null;

  const confidencePct = Math.round((analysis.confidence || 0.88) * 100);

  return (
    <GlassPanel className="p-3">
      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2 border-secondary border-opacity-25">
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--cp-accent-cyan)',
            }}
            className="animate-pulse-cyan"
          />
          <span className="fw-semibold small text-uppercase" style={{ letterSpacing: '0.05em', color: 'var(--cp-accent-cyan)' }}>
            AI Intelligence Diagnostics
          </span>
        </div>
        <span className="badge bg-primary bg-opacity-25 text-primary small">
          Confidence {confidencePct}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="d-flex justify-content-between small text-secondary mb-1">
          <span>Model Certainty</span>
          <span>{confidencePct}%</span>
        </div>
        <div
          style={{
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${confidencePct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--cp-accent-cyan), var(--cp-accent-primary))',
              borderRadius: '999px',
              transition: 'width 1s ease',
            }}
          />
        </div>
      </div>

      {/* Detected Objects */}
      {analysis.detectedObjects && analysis.detectedObjects.length > 0 && (
        <div className="mb-3">
          <span className="small text-secondary d-block mb-1">Detected Visual Features</span>
          <div className="d-flex flex-wrap gap-1">
            {analysis.detectedObjects.map((obj, i) => (
              <span
                key={i}
                className="badge"
                style={{
                  background: 'rgba(100, 210, 255, 0.12)',
                  color: 'var(--cp-accent-cyan)',
                  border: '1px solid rgba(100, 210, 255, 0.25)',
                  fontSize: '0.75rem',
                }}
              >
                <i className="bi bi-tag-fill me-1" />
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NLP Extraction Summary */}
      {analysis.nlpExtraction && (
        <div
          className="p-2 rounded"
          style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--cp-glass-border)' }}
        >
          <div className="row g-2 small">
            <div className="col-6">
              <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>Issue</span>
              <span className="fw-medium text-truncate d-block">{analysis.nlpExtraction.issue}</span>
            </div>
            <div className="col-6">
              <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>Severity</span>
              <span className="fw-medium text-capitalize">{analysis.nlpExtraction.severity}</span>
            </div>
            <div className="col-12 mt-1">
              <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>Assessed Impact</span>
              <span className="fw-normal text-secondary">{analysis.nlpExtraction.impact}</span>
            </div>
          </div>
        </div>
      )}
    </GlassPanel>
  );
};
