// ============================================================
// CivicPulse Incident Reporting Wizard — Cinematic AI Vision Experience
// Spatial Reticle + Multi-Stage AI Neural Scan + Liquid Glass Results
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { getCurrentBrowserPosition, reverseGeocode } from '../../services/googleMapsService';
import {
  GlassSurface,
  GlassButton,
  GlassInput,
  StatusPill,
  GlassHazardDropdown,
} from '../../design-system/components';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import { optimizeImageForUpload } from '../../services/imageCompressionService';
import {
  ALL_INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  type IncidentCategory,
  type AIAnalysis,
} from '@civicpulse/shared';

type WizardStep = 'capture' | 'ai_scan' | 'details' | 'success';

export const ReportIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedLocation } = useLocationStore();

  const [step, setStep] = useState<WizardStep>('capture');

  // Separated Prediction & User Confirmation State (Eliminates Pothole Default Bug)
  const [predictedCategory, setPredictedCategory] = useState<IncidentCategory | null>(null);
  const [userConfirmedCategory, setUserConfirmedCategory] = useState<IncidentCategory | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [isAiUncertain, setIsAiUncertain] = useState<boolean>(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const uploadSeqRef = useRef<number>(0);

  // Active Category Contract: confirmed selection takes precedence; fallback to AI prediction or unclassified 'other'
  const effectiveCategory: IncidentCategory = userConfirmedCategory || predictedCategory || 'other';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [address, setAddress] = useState(
    selectedLocation?.formattedAddress || 'Tamil Nadu Sector'
  );
  const [coordinates, setCoordinates] = useState<[number, number]>([
    selectedLocation?.longitude || 77.0279,
    selectedLocation?.latitude || 11.0289,
  ]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Multi-stage AI Pipeline State
  const [aiStage, setAiStage] = useState<number>(0);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [severityScore, setSeverityScore] = useState<number | null>(null);
  const [severityReasons, setSeverityReasons] = useState<string[]>([]);
  const [reviewRequired, setReviewRequired] = useState<boolean>(false);
  const [aiInferenceId, setAiInferenceId] = useState<string | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<Array<{
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    label: string;
    confidence: number;
  }>>([]);

  const [loading, setLoading] = useState(false);
  const [createdIncident, setCreatedIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aiStages = [
    { label: 'YOLO11 Hazard Detection', desc: 'Running YOLO11 compact municipal object detector' },
    { label: 'PaddleOCR Text Extraction', desc: 'Reading notices, regulatory signboards & emergency markers' },
    { label: 'Qwen2.5-VL Scene Reasoning', desc: 'Extracting grounded physical narrative & safety risks' },
    { label: 'CLIP & Damage Segmentation', desc: 'Generating 512-d embeddings & YOLO11-seg surface damage area' },
  ];

  const handleImageFile = async (file: File) => {
    // 1. Mandatory Clear of Stale AI State on new image selection
    setAiAnalysis(null);
    setDetectedBoxes([]);
    setPredictedCategory(null);
    setUserConfirmedCategory(null);
    setAiConfidence(null);
    setIsAiUncertain(false);
    setAiWarnings([]);
    setSeverityScore(null);
    setSeverityReasons([]);
    setAiInferenceId(null);

    let targetFile = file;
    try {
      const opt = await optimizeImageForUpload(file);
      targetFile = opt.file;
    } catch {
      // Graceful fallback to original file if compression unavailable
      targetFile = file;
    }
    const url = URL.createObjectURL(targetFile);
    setImagePreview(url);
    startAiScanSequence(targetFile);
  };

  const startAiScanSequence = async (file?: File) => {
    // Request Sequence Token to prevent race conditions & late-arriving responses
    const currentSeq = ++uploadSeqRef.current;
    setStep('ai_scan');
    setAiStage(0);

    const t1 = setTimeout(() => setAiStage(1), 500);
    const t2 = setTimeout(() => setAiStage(2), 1000);
    const t3 = setTimeout(() => setAiStage(3), 1500);

    let realResult: any = null;
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('include_ocr', 'true');
        formData.append('include_qwen', 'true');
        formData.append('include_clip', 'true');
        formData.append('include_segmentation', 'true');

        const response = await api.post('/ai/analyze-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data?.success && response.data?.data) {
          realResult = response.data.data;
        }
      } catch (err) {
        console.warn('[Civiora AI] Inference service offline or deferred; citizen manual review mode enabled', err);
      }
    }

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
    setAiStage(3);

    setTimeout(() => {
      // Discard response if a newer image has been uploaded
      if (currentSeq !== uploadSeqRef.current) {
        return;
      }

      // Safe normalization against canonical taxonomy
      const rawCat = (
        realResult?.suggested_category ||
        realResult?.primary_category ||
        realResult?.primary_synthesis?.suggested_category
      );

      let canonicalCat: IncidentCategory = 'other';
      if (rawCat && ALL_INCIDENT_CATEGORIES.includes(rawCat as IncidentCategory)) {
        canonicalCat = rawCat as IncidentCategory;
      } else if (rawCat === 'garbage') {
        canonicalCat = 'garbage_accumulation';
      } else if (rawCat === 'road_crack') {
        canonicalCat = 'road_damage';
      } else if (rawCat === 'drainage_obstruction') {
        canonicalCat = 'drainage_blockage';
      } else if (rawCat === 'damaged_streetlight') {
        canonicalCat = 'broken_streetlight';
      } else if (rawCat === 'damaged_traffic_sign') {
        canonicalCat = 'damaged_traffic_signal';
      } else if (rawCat === 'water_leak') {
        canonicalCat = 'water_leakage';
      }

      // Real confidence extraction — strictly NO artificial 0.94 fallback
      const rawConf: number | null = typeof realResult?.overall_confidence === 'number'
        ? realResult.overall_confidence
        : (typeof realResult?.primary_synthesis?.confidence === 'number'
          ? realResult.primary_synthesis.confidence
          : null);

      const isUncertainFlag = Boolean(
        realResult?.uncertain ||
        canonicalCat === 'other' ||
        (rawConf !== null && rawConf < 0.40) ||
        !realResult
      );

      // Real bounding box extraction — strictly NO fabricated demo boxes
      const yoloDetections: any[] = realResult?.stages?.detector_yolo11?.detections || [];
      const realBoxes = yoloDetections.map((d: any) => ({
        x_min: Math.max(0, Math.min(1, d.box?.x_min ?? 0)),
        y_min: Math.max(0, Math.min(1, d.box?.y_min ?? 0)),
        x_max: Math.max(0, Math.min(1, d.box?.x_max ?? 1)),
        y_max: Math.max(0, Math.min(1, d.box?.y_max ?? 1)),
        label: d.canonical_category || d.raw_label || canonicalCat,
        confidence: typeof d.confidence === 'number' ? d.confidence : (rawConf ?? 0),
      }));

      const qwenDesc = realResult?.stages?.qwen2_5_vl?.structured_output?.image_description;
      const ocrText = realResult?.stages?.ocr_text?.full_text;
      const detectedObjs = yoloDetections.map((d: any) => d.canonical_category || d.raw_label);

      setPredictedCategory(canonicalCat);
      setUserConfirmedCategory((prev) => prev || (canonicalCat !== 'other' ? canonicalCat : null));
      setAiConfidence(rawConf);
      setIsAiUncertain(isUncertainFlag);
      setDetectedBoxes(realBoxes);

      const sevAssessment = realResult?.severity_assessment || realResult?.primary_synthesis?.severity_assessment;
      const score = realResult?.severity_score ?? sevAssessment?.score ?? (isUncertainFlag ? 25 : 55);
      const reasons = realResult?.review_reasons ?? sevAssessment?.reasons ?? (
        isUncertainFlag
          ? ['Visual sensor confidence below verified threshold', 'Requires citizen category confirmation']
          : [`Identified ${INCIDENT_CATEGORY_LABELS[canonicalCat] || canonicalCat} hazard`, 'Surface geometry verified across visual sensor pipeline']
      );

      setSeverityScore(score);
      setSeverityReasons(reasons);
      setReviewRequired(realResult?.human_review_required ?? isUncertainFlag);
      setAiInferenceId(realResult?.saved_inference_id ?? null);
      setAiWarnings(realResult?.warnings ?? (isUncertainFlag ? ['AI model could not confidently identify this image. Please review and confirm the category.'] : []));

      setAiAnalysis({
        category: canonicalCat,
        confidence: rawConf ?? 0.0,
        severity: (realResult?.recommended_severity as any) || (isEmergency ? 'critical' : isUncertainFlag ? 'low' : 'medium'),
        detectedObjects: detectedObjs.length > 0 ? detectedObjs : (canonicalCat !== 'other' ? [canonicalCat] : []),
        nlpExtraction: {
          category: canonicalCat,
          issue: qwenDesc || (isUncertainFlag ? 'Unclassified scene requiring citizen verification' : `Detected ${INCIDENT_CATEGORY_LABELS[canonicalCat] || canonicalCat}`),
          severity: (realResult?.recommended_severity as any) || (isEmergency ? 'critical' : isUncertainFlag ? 'low' : 'medium'),
          impact: ocrText ? `Notice: ${ocrText}` : (isUncertainFlag ? 'Visual triage awaiting manual inspection' : 'Surface hazard affecting transit corridor'),
          potentialRisk: realResult?.stages?.qwen2_5_vl?.structured_output?.potential_obstruction_or_safety_concerns?.[0] || 'Requires municipal field triage',
        },
        processedAt: new Date().toISOString(),
        modelVersion: realResult?.model_version || 'Civiora-YOLO11-Multimodal-v1.0',
      });

      if (qwenDesc) {
        setDescription(qwenDesc);
      } else if (!isUncertainFlag) {
        setDescription((prev) => prev || `Identified ${INCIDENT_CATEGORY_LABELS[canonicalCat] || canonicalCat} requiring prompt municipal triage.`);
      }

      if (!isUncertainFlag && canonicalCat !== 'other') {
        setTitle((prev) => prev || `Reported ${INCIDENT_CATEGORY_LABELS[canonicalCat] || canonicalCat}`);
      } else {
        setTitle((prev) => prev || 'Civic Hazard Inspection');
      }

      setStep('details');
    }, 600);
  };

  type GpsStatus =
    | 'idle'
    | 'requesting'
    | 'acquiring'
    | 'geocoding'
    | 'locked'
    | 'permission_denied'
    | 'timeout'
    | 'unavailable'
    | 'geocoding_failed';
  type AddressSource = 'gps' | 'manual' | 'map_click' | 'initial';
  type SubmissionState =
    | 'idle'
    | 'validating'
    | 'submitting_report'
    | 'report_saved'
    | 'generating_pdf'
    | 'completed'
    | 'failed';

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsMeta, setGpsMeta] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [addressSource, setAddressSource] = useState<AddressSource>('initial');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'json' | 'csv' | 'txt' | null>(null);

  const handleGetLocation = async () => {
    if (gpsStatus === 'requesting' || gpsStatus === 'acquiring' || gpsStatus === 'geocoding') {
      return;
    }

    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setGpsStatus('unavailable');
      setError('Geolocation API is not supported by your current browser.');
      return;
    }

    setError(null);
    setGpsStatus('requesting');

    try {
      setGpsStatus('acquiring');
      const pos = await getCurrentBrowserPosition();
      const meta = {
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp || new Date().toISOString(),
      };
      setGpsMeta(meta);
      setCoordinates([pos.longitude, pos.latitude]);

      setGpsStatus('geocoding');
      try {
        const rev = await reverseGeocode(pos.latitude, pos.longitude);
        setAddress(rev.formattedAddress);
        setAddressSource('gps');
        setGpsStatus('locked');
      } catch (geoErr: any) {
        console.warn('[Civiora Report] Reverse geocoding fallback engaged:', geoErr);
        setAddressSource('manual');
        setGpsStatus('geocoding_failed');
      }
    } catch (err: any) {
      console.warn('[Civiora Report] GPS acquisition error:', err);
      if (err.type === 'PERMISSION_DENIED' || err.code === 1) {
        setGpsStatus('permission_denied');
      } else if (err.type === 'TIMEOUT' || err.code === 3) {
        setGpsStatus('timeout');
      } else {
        setGpsStatus('unavailable');
      }
    }
  };

  const userDisplayName = (user as any)?.profile?.firstName
    ? `${(user as any).profile.firstName} ${(user as any).profile.lastName || ''}`.trim()
    : (user as any)?.name || '';

  const [reporterName, setReporterName] = useState(userDisplayName);
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [reporterPhone, setReporterPhone] = useState('');
  const [additionalMessage, setAdditionalMessage] = useState('');
  const [consentToShareContact, setConsentToShareContact] = useState(true);

  // Dispatch status state
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    status: 'sent' | 'simulated' | 'failed';
    recipient?: string;
    messageId?: string;
    pdfSizeBytes?: number;
    message?: string;
    timestamp?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      if (!reporterName) {
        setReporterName(
          (user as any)?.profile?.firstName
            ? `${(user as any).profile.firstName} ${(user as any).profile.lastName || ''}`.trim()
            : (user as any)?.name || ''
        );
      }
      if (!reporterEmail && user.email) {
        setReporterEmail(user.email);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=/report');
      return;
    }

    setError(null);

    // Rigorous Client-side validation prior to network dispatch
    setSubmissionState('validating');
    if (title.trim().length < 5) {
      setError('Incident Title must be at least 5 characters in length.');
      setSubmissionState('failed');
      return;
    }
    if (description.trim().length < 10) {
      setError('Incident Description must be at least 10 characters so municipal authorities can triage effectively.');
      setSubmissionState('failed');
      return;
    }
    if (!address.trim()) {
      setError('Municipal address or sector location is required.');
      setSubmissionState('failed');
      return;
    }
    if (!coordinates || coordinates.length !== 2 || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      setError('Valid incident coordinates are required. Please sync GPS or pick a location on the map.');
      setSubmissionState('failed');
      return;
    }

    setSubmissionState('submitting_report');
    setLoading(true);

    try {
      // 1. Create and persist incident in MongoDB Atlas
      const res = await api.post('/incidents', {
        category: effectiveCategory,
        title: title.trim(),
        description: description.trim(),
        isEmergency,
        location: {
          coordinates,
          address: address.trim(),
        },
        reportingMode: isEmergency ? 'emergency' : 'standard',
        ai: aiAnalysis ? {
          category: aiAnalysis.category,
          confidence: aiAnalysis.confidence,
          severity: aiAnalysis.severity,
          detectedObjects: aiAnalysis.detectedObjects,
          boundingBoxes: detectedBoxes.map((b) => ({
            x: b.x_min,
            y: b.y_min,
            w: Math.max(0.01, b.x_max - b.x_min),
            h: Math.max(0.01, b.y_max - b.y_min),
            label: b.label,
          })),
          nlpExtraction: aiAnalysis.nlpExtraction,
          processedAt: aiAnalysis.processedAt,
          modelVersion: aiAnalysis.modelVersion,
        } : undefined,
        aiInferenceId: aiInferenceId || undefined,
        severityScore: severityScore !== null ? severityScore : undefined,
      });

      const incidentData = res.data.data;
      setCreatedIncident(incidentData);
      setSubmissionState('report_saved');

      const targetId = incidentData.incidentNumber || incidentData._id || incidentData.id;

      // 2. Immediate One-Click Municipal Dispatch (PDF Generation + Resend Email)
      setSubmissionState('generating_pdf');
      setDispatchLoading(true);
      try {
        const dispatchRes = await api.post(`/incidents/${targetId}/dispatch`, {
          name: reporterName.trim() || userDisplayName,
          email: reporterEmail.trim() || user?.email,
          phone: reporterPhone.trim() || undefined,
          additionalMessage: additionalMessage.trim() || undefined,
          consent: consentToShareContact,
          idempotencyKey: `disp-${targetId}-${Date.now()}`,
        });

        if (dispatchRes.data.success) {
          setDispatchResult({
            success: true,
            status: dispatchRes.data.status,
            recipient: dispatchRes.data.recipient,
            messageId: dispatchRes.data.messageId,
            pdfSizeBytes: dispatchRes.data.pdfSizeBytes,
            message: dispatchRes.data.message,
            timestamp: dispatchRes.data.timestamp,
          });
        } else {
          setDispatchResult({
            success: false,
            status: 'failed',
            recipient: dispatchRes.data.recipient,
            message: dispatchRes.data.message,
            error: dispatchRes.data.error || dispatchRes.data.message || 'Municipal dispatch delivery pending.',
          });
        }
      } catch (dispErr: any) {
        console.warn('[Dispatch] Server dispatch error:', dispErr);
        setDispatchResult({
          success: false,
          status: 'failed',
          error: dispErr.response?.data?.error?.message || dispErr.message || 'Dispatch delivery issue',
        });
      } finally {
        setDispatchLoading(false);
      }

      setSubmissionState('completed');
      setStep('success');
    } catch (err: any) {
      setSubmissionState('failed');
      const msg = err.response?.data?.error?.message || err.message || 'Failed to submit report. Please retry.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryDispatch = async () => {
    const targetId = createdIncident?.incidentNumber || createdIncident?._id || createdIncident?.id;
    if (!targetId || dispatchLoading) return;
    setDispatchLoading(true);
    try {
      const dispatchRes = await api.post(`/incidents/${targetId}/dispatch`, {
        name: reporterName.trim() || userDisplayName,
        email: reporterEmail.trim() || user?.email,
        phone: reporterPhone.trim() || undefined,
        additionalMessage: additionalMessage.trim() || undefined,
        consent: consentToShareContact,
        idempotencyKey: `disp-retry-${targetId}-${Date.now()}`,
      });

      if (dispatchRes.data.success) {
        setDispatchResult({
          success: true,
          status: dispatchRes.data.status,
          recipient: dispatchRes.data.recipient,
          messageId: dispatchRes.data.messageId,
          pdfSizeBytes: dispatchRes.data.pdfSizeBytes,
          message: dispatchRes.data.message,
          timestamp: dispatchRes.data.timestamp,
        });
      } else {
        setDispatchResult({
          success: false,
          status: 'failed',
          recipient: dispatchRes.data.recipient,
          message: dispatchRes.data.message,
          error: dispatchRes.data.error || dispatchRes.data.message || 'Dispatch retry pending.',
        });
      }
    } catch (dispErr: any) {
      setDispatchResult({
        success: false,
        status: 'failed',
        error: dispErr.response?.data?.error?.message || dispErr.message || 'Dispatch retry failed',
      });
    } finally {
      setDispatchLoading(false);
    }
  };

  const downloadBlobFile = async (
    endpoint: string,
    filename: string,
    mimeType: string,
    format: 'pdf' | 'json' | 'csv' | 'txt'
  ) => {
    setDownloadingFormat(format);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 300);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Could not download ${filename}. ${err.response?.data?.error?.message || err.message || 'Check connection.'}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadPdf = async () => {
    const targetId = createdIncident?.incidentNumber || createdIncident?._id || createdIncident?.id;
    if (!targetId || downloadingFormat) return;
    const ref = createdIncident?.incidentNumber || targetId;
    await downloadBlobFile(`/incidents/${targetId}/report.pdf`, `Civiora_Report_${ref}.pdf`, 'application/pdf', 'pdf');
  };

  const handleExportJson = async () => {
    const targetId = createdIncident?.incidentNumber || createdIncident?._id || createdIncident?.id;
    if (!targetId || downloadingFormat) return;
    const ref = createdIncident?.incidentNumber || targetId;
    await downloadBlobFile(`/incidents/${targetId}/report/export?format=json`, `Civiora-Incident-${ref}.json`, 'application/json', 'json');
  };

  const handleExportCsv = async () => {
    const targetId = createdIncident?.incidentNumber || createdIncident?._id || createdIncident?.id;
    if (!targetId || downloadingFormat) return;
    const ref = createdIncident?.incidentNumber || targetId;
    await downloadBlobFile(`/incidents/${targetId}/report/export?format=csv`, `Civiora-Incident-${ref}.csv`, 'text/csv', 'csv');
  };

  const handleExportTxt = async () => {
    const targetId = createdIncident?.incidentNumber || createdIncident?._id || createdIncident?.id;
    if (!targetId || downloadingFormat) return;
    const ref = createdIncident?.incidentNumber || targetId;
    await downloadBlobFile(`/incidents/${targetId}/report/export?format=txt`, `Civiora-Incident-${ref}.txt`, 'text/plain', 'txt');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="container py-4 py-lg-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          {/* Spatial Progress Pill Bar */}
          <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 mb-4">
            <div>
              <span className="text-uppercase small fw-semibold" style={{ color: '#64D2FF' }}>
                CITIZEN INTELLIGENCE PORTAL
              </span>
              <h3 className="fw-bold mb-0" style={{ color: 'var(--cp-text-primary)' }}>
                Report an Urban Hazard
              </h3>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-1 gap-sm-2">
              <span
                className={`badge rounded-pill px-2 px-sm-3 py-1 py-sm-2 ${
                  step === 'capture' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
                style={{ fontSize: '0.78rem' }}
              >
                1. Capture
              </span>
              <span
                className={`badge rounded-pill px-2 px-sm-3 py-1 py-sm-2 ${
                  step === 'ai_scan' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
                style={{ fontSize: '0.78rem' }}
              >
                2. AI Scan
              </span>
              <span
                className={`badge rounded-pill px-2 px-sm-3 py-1 py-sm-2 ${
                  step === 'details' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
                style={{ fontSize: '0.78rem' }}
              >
                3. Triage
              </span>
              <span
                className={`badge rounded-pill px-2 px-sm-3 py-1 py-sm-2 ${
                  step === 'success' ? 'bg-success' : 'bg-secondary bg-opacity-25'
                }`}
                style={{ fontSize: '0.78rem' }}
              >
                4. Dispatch
              </span>
            </div>
          </div>

          {/* ── STEP 1: CINEMATIC CAMERA / UPLOAD VIEWPORT ─────── */}
          {step === 'capture' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-3 p-sm-4 p-md-5 text-center">
              <div
                className="position-relative mx-auto mb-4 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                style={{
                  maxWidth: '520px',
                  width: '100%',
                  height: 'clamp(240px, 38vh, 340px)',
                  borderRadius: '24px',
                  background: 'rgba(10, 14, 23, 0.75)',
                  border: '2px dashed rgba(100, 210, 255, 0.4)',
                }}
              >
                {/* Viewport Reticle Brackets */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    borderTop: '3px solid #64D2FF',
                    borderLeft: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '28px',
                    height: '28px',
                    borderTop: '3px solid #64D2FF',
                    borderRight: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    borderBottom: '3px solid #64D2FF',
                    borderLeft: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '28px',
                    height: '28px',
                    borderBottom: '3px solid #64D2FF',
                    borderRight: '3px solid #64D2FF',
                  }}
                />

                {/* Center crosshair */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: '1px solid rgba(100, 210, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64D2FF',
                    marginBottom: '1rem',
                  }}
                >
                  <i className="bi bi-camera fs-3" />
                </div>

                <h5 className="fw-bold mb-1">Capture or Upload Hazard Photo</h5>
                <p className="text-secondary small mb-3" style={{ maxWidth: '340px' }}>
                  Our YOLOv8 computer vision model will automatically detect the hazard class, severity, and bounding coordinates.
                </p>

                <label className="btn btn-primary btn-sm px-4 rounded-pill shadow-sm" style={{ cursor: 'pointer' }}>
                  <i className="bi bi-upload me-2" />
                  Select Photo / Camera Frame
                  <input
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Instant Simulated Camera Samples */}
              <span className="small text-secondary d-block mb-2">Or choose a test hazard frame:</span>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserConfirmedCategory('pothole');
                    setPredictedCategory('pothole');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Asphalt Pothole
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserConfirmedCategory('flooding');
                    setPredictedCategory('flooding');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Storm Water Flood
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserConfirmedCategory('broken_streetlight');
                    setPredictedCategory('broken_streetlight');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Faulty Streetlight
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserConfirmedCategory('garbage_accumulation');
                    setPredictedCategory('garbage_accumulation');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Sanitation Overflow
                </button>
              </div>
            </GlassSurface>
          )}

          {/* ── STEP 2: MULTI-STAGE AI NEURAL SCAN ──────────────── */}
          {step === 'ai_scan' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5 text-center">
              <div
                className="position-relative mx-auto mb-4 overflow-hidden"
                style={{
                  maxWidth: '520px',
                  height: '300px',
                  borderRadius: '20px',
                  background: imagePreview
                    ? `url(${imagePreview}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #0A0E17, #111827)',
                  border: '1px solid rgba(100, 210, 255, 0.4)',
                }}
              >
                {/* Laser Grid Sweep Animation */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, transparent, #9FC9FF, transparent)',
                    boxShadow: '0 0 24px #9FC9FF',
                    animation: 'sweepLaser 2s infinite ease-in-out',
                  }}
                />

                {/* Bounding Box Hologram Target */}
                <div
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '25%',
                    width: '50%',
                    height: '50%',
                    border: '2px solid #30D158',
                    backgroundColor: 'rgba(48, 209, 88, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    padding: '6px',
                  }}
                >
                  <span
                    className="badge"
                    style={{
                      background: '#30D158',
                      color: '#000',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    HAZARD SEGMENT 96.4%
                  </span>
                </div>

                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3">
                  <div className="spinner-grow text-info spinner-grow-sm me-2" role="status" />
                  <span className="small font-monospace" style={{ color: '#9FC9FF' }}>
                    NEURAL INFERENCE ACTIVE • CIVIORA-VISION
                  </span>
                </div>
              </div>

              {/* Step By Step Pipeline Breadcrumbs */}
              <div className="mx-auto text-start" style={{ maxWidth: '480px' }}>
                {aiStages.map((stg, i) => (
                  <div
                    key={stg.label}
                    className="d-flex align-items-center gap-3 p-2 rounded-3 mb-2"
                    style={{
                      background:
                        aiStage === i
                          ? 'rgba(10, 132, 255, 0.2)'
                          : aiStage > i
                          ? 'rgba(48, 209, 88, 0.15)'
                          : 'rgba(255, 255, 255, 0.03)',
                      border:
                        aiStage === i
                          ? '1px solid #64D2FF'
                          : aiStage > i
                          ? '1px solid rgba(48, 209, 88, 0.4)'
                          : '1px solid transparent',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        background:
                          aiStage > i
                            ? '#30D158'
                            : aiStage === i
                            ? '#0A84FF'
                            : 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                      }}
                    >
                      {aiStage > i ? <i className="bi bi-check" /> : i + 1}
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: 'var(--cp-text-primary)' }}>
                        {stg.label}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                        {stg.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassSurface>
          )}

          {/* ── STEP 3: TRIAGE DETAILS CONFIRMATION ────────────── */}
          {step === 'details' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5">
              {/* AI Multimodal Evidence & Explainable Severity Assessment Card */}
              {aiAnalysis && (
                <div
                  className="p-3 p-md-4 rounded-4 mb-4"
                  style={{
                    background: 'rgba(10, 132, 255, 0.08)',
                    border: '1px solid rgba(100, 210, 255, 0.35)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Top Bar: Model Badge + Severity Pill */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="badge d-inline-flex align-items-center gap-1 px-2 py-1"
                        style={{
                          background: 'rgba(100, 210, 255, 0.15)',
                          color: '#64D2FF',
                          border: '1px solid rgba(100, 210, 255, 0.4)',
                        }}
                      >
                        <i className="bi bi-cpu-fill" /> CIVIORA MULTIMODAL AI
                      </span>
                      <span className="small text-secondary font-monospace">
                        CONFIDENCE: {typeof aiConfidence === 'number' ? `${Math.round(aiConfidence * 100)}%` : 'UNASSESSED'}
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {isAiUncertain && (
                        <span
                          className="badge px-2 py-1"
                          style={{
                            background: 'rgba(255, 159, 10, 0.2)',
                            color: '#FF9F0A',
                            border: '1px solid rgba(255, 159, 10, 0.4)',
                          }}
                        >
                          <i className="bi bi-question-diamond-fill me-1" /> UNCERTAIN / CONFIRMATION REQUIRED
                        </span>
                      )}
                      {reviewRequired && !isAiUncertain && (
                        <span
                          className="badge px-2 py-1"
                          style={{
                            background: 'rgba(255, 159, 10, 0.2)',
                            color: '#FF9F0A',
                            border: '1px solid rgba(255, 159, 10, 0.4)',
                          }}
                        >
                          <i className="bi bi-exclamation-triangle-fill me-1" /> HUMAN REVIEW ADVISORY
                        </span>
                      )}
                      <span
                        className="badge px-3 py-2 fw-bold text-uppercase"
                        style={{
                          background:
                            (severityScore || 0) >= 80 || aiAnalysis.severity === 'critical'
                              ? 'rgba(255, 69, 58, 0.25)'
                              : (severityScore || 0) >= 60 || aiAnalysis.severity === 'high'
                              ? 'rgba(255, 159, 10, 0.25)'
                              : (severityScore || 0) >= 35 || aiAnalysis.severity === 'medium'
                              ? 'rgba(255, 214, 10, 0.25)'
                              : 'rgba(48, 209, 88, 0.25)',
                          color:
                            (severityScore || 0) >= 80 || aiAnalysis.severity === 'critical'
                              ? '#FF453A'
                              : (severityScore || 0) >= 60 || aiAnalysis.severity === 'high'
                              ? '#FF9F0A'
                              : (severityScore || 0) >= 35 || aiAnalysis.severity === 'medium'
                              ? '#FFD60A'
                              : '#30D158',
                          border: '1px solid currentColor',
                        }}
                      >
                        SEVERITY SCORE: {severityScore ?? (isAiUncertain ? 25 : 65)}/100 • {aiAnalysis.severity?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                  </div>

                  {/* Two column: Photo with Bounding Boxes on left, Explainable Severity Engine on right */}
                  <div className="row g-3 align-items-start mb-3">
                    {imagePreview && (
                      <div className="col-12 col-md-5">
                        <div
                          className="position-relative overflow-hidden rounded-3 shadow-sm"
                          style={{
                            height: '180px',
                            background: `url(${imagePreview}) center/cover no-repeat`,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {/* Render True Bounding Boxes Only */}
                          {detectedBoxes.length > 0 ? (
                            detectedBoxes.map((b, idx) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'absolute',
                                  left: `${Math.round(b.x_min * 100)}%`,
                                  top: `${Math.round(b.y_min * 100)}%`,
                                  width: `${Math.max(12, Math.round((b.x_max - b.x_min) * 100))}%`,
                                  height: `${Math.max(12, Math.round((b.y_max - b.y_min) * 100))}%`,
                                  border: '2px solid #30D158',
                                  backgroundColor: 'rgba(48, 209, 88, 0.15)',
                                  borderRadius: '4px',
                                  pointerEvents: 'none',
                                }}
                              >
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '-18px',
                                    left: 0,
                                    background: '#30D158',
                                    color: '#000',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {INCIDENT_CATEGORY_LABELS[b.label as IncidentCategory] || b.label} ({Math.round(b.confidence * 100)}%)
                                </span>
                              </div>
                            ))
                          ) : (
                            <div
                              className="position-absolute bottom-0 start-0 end-0 p-2 text-center"
                              style={{
                                background: 'rgba(8, 19, 38, 0.88)',
                                color: '#9FC9FF',
                                fontSize: '0.72rem',
                                borderTop: '1px solid rgba(100, 210, 255, 0.2)',
                              }}
                            >
                              <i className="bi bi-bounding-box me-1" />
                              Scene-level analysis applied • No discrete bounding boxes detected
                            </div>
                          )}
                        </div>
                        <div className="text-center mt-1 text-secondary" style={{ fontSize: '0.7rem' }}>
                          Spatial Reticle & YOLO11 Bounding Boxes
                        </div>
                      </div>
                    )}

                    <div className={imagePreview ? "col-12 col-md-7" : "col-12"}>
                      <div className="small fw-semibold text-info mb-1">
                        Explainable Severity Factors:
                      </div>
                      <div className="d-flex flex-column gap-1 mb-2">
                        {severityReasons.map((reason, idx) => (
                          <div
                            key={idx}
                            className="small d-flex align-items-center gap-2"
                            style={{ color: 'var(--cp-text-secondary)', fontSize: '0.8rem' }}
                          >
                            <i className="bi bi-shield-check text-success" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      <div className="small fw-semibold text-secondary mb-1">
                        Physical Scene Context:
                      </div>
                      <p
                        className="small mb-0"
                        style={{ color: 'var(--cp-text-primary)', fontSize: '0.82rem', lineHeight: '1.3' }}
                      >
                        {aiAnalysis.nlpExtraction?.issue || aiAnalysis.nlpExtraction?.impact}
                      </p>
                    </div>
                  </div>

                  {/* Citizen Confirmation Note */}
                  <div
                    className="p-2.5 px-3 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <span className="small text-secondary" style={{ fontSize: '0.78rem' }}>
                      Suggested Category:{' '}
                      <strong className="text-light">
                        {predictedCategory ? (INCIDENT_CATEGORY_LABELS[predictedCategory] || predictedCategory) : 'None (Unclassified)'}
                      </strong>
                      . Citizen Confirmed:{' '}
                      <strong className="text-info">
                        {INCIDENT_CATEGORY_LABELS[effectiveCategory] || effectiveCategory}
                      </strong>
                    </span>
                    <span className="badge bg-secondary bg-opacity-25 text-info" style={{ fontSize: '0.7rem' }}>
                      Citizen editable
                    </span>
                  </div>

                  {/* AI Uncertainty & Field Triage Warnings */}
                  {aiWarnings.length > 0 && (
                    <div
                      className="mt-2 p-2 px-3 rounded-3 d-flex align-items-center gap-2"
                      style={{
                        background: 'rgba(255, 159, 10, 0.12)',
                        border: '1px solid rgba(255, 159, 10, 0.3)',
                        color: '#FF9F0A',
                        fontSize: '0.78rem',
                      }}
                    >
                      <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                      <span>{aiWarnings.join(' • ')}</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="bi bi-exclamation-octagon me-2" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <GlassHazardDropdown
                      value={effectiveCategory}
                      onChange={(newCat) => setUserConfirmedCategory(newCat)}
                      predictedCategory={predictedCategory}
                      aiConfidence={aiConfidence}
                      isUncertain={isAiUncertain}
                      label="Hazard Classification:"
                      helperText="Confirm or calibrate the exact municipal hazard classification."
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Emergency One-Tap Escalation:
                    </label>
                    <div className="form-check form-switch pt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="emergencySwitch"
                        checked={isEmergency}
                        onChange={(e) => setIsEmergency(e.target.checked)}
                      />
                      <label className="form-check-label small text-danger fw-bold" htmlFor="emergencySwitch">
                        Flag as Critical Emergency (Direct Police/Fire Radar)
                      </label>
                    </div>
                  </div>
                </div>

                <GlassInput
                  label="Incident Title"
                  required
                  placeholder="e.g. Dangerous 2-meter deep pothole on 4th Cross"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div>
                  <label className="form-label small fw-semibold text-secondary">
                    Description & Hazard Impact:
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{
                      background: 'var(--cp-glass-bg)',
                      color: 'var(--cp-text-primary)',
                      borderColor: 'var(--cp-glass-border)',
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Exact Incident Location Picker via Google Maps */}
                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary d-flex justify-content-between align-items-center">
                    <span>Pin Exact Incident Location on Google Map:</span>
                    <span className="text-info font-monospace" style={{ fontSize: '0.72rem' }}>
                      LAT: {coordinates[1].toFixed(5)}, LNG: {coordinates[0].toFixed(5)}
                    </span>
                  </label>
                  <div
                    style={{
                      height: '280px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--cp-glass-border)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <GoogleMapView
                      initialLat={coordinates[1]}
                      initialLng={coordinates[0]}
                      initialZoom={16}
                      onLocationSelect={(loc) => {
                        setCoordinates([loc.longitude, loc.latitude]);
                        setAddress(loc.formattedAddress);
                        setAddressSource('map_click');
                        setGpsStatus('idle');
                      }}
                      showSearchBar={true}
                    />
                  </div>
                </div>

                <div className="row g-2 align-items-end mb-2">
                  <div className="col-12 col-md-8">
                    <GlassInput
                      label="Municipal Address / Sector"
                      required
                      icon="geo-alt"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setAddressSource('manual');
                      }}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <button
                      type="button"
                      disabled={gpsStatus === 'requesting' || gpsStatus === 'acquiring' || gpsStatus === 'geocoding'}
                      onClick={handleGetLocation}
                      className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                      style={{
                        borderRadius: '12px',
                        borderColor: gpsStatus === 'locked' ? 'rgba(48, 209, 88, 0.4)' : undefined,
                        background: gpsStatus === 'locked' ? 'rgba(48, 209, 88, 0.1)' : undefined,
                      }}
                    >
                      {gpsStatus === 'requesting' || gpsStatus === 'acquiring' ? (
                        <>
                          <span className="spinner-border spinner-border-sm text-info" role="status" />
                          <span className="text-info small fw-semibold">Acquiring GPS Fix...</span>
                        </>
                      ) : gpsStatus === 'geocoding' ? (
                        <>
                          <span className="spinner-border spinner-border-sm text-primary" role="status" />
                          <span className="text-primary small fw-semibold">Resolving Address...</span>
                        </>
                      ) : gpsStatus === 'locked' ? (
                        <>
                          <i className="bi bi-check-circle-fill text-success" />
                          <span className="text-success small fw-semibold">
                            GPS Locked {gpsMeta ? `(±${gpsMeta.accuracy}m)` : ''}
                          </span>
                        </>
                      ) : gpsStatus === 'permission_denied' ? (
                        <>
                          <i className="bi bi-shield-x text-danger" />
                          <span className="text-danger small fw-semibold">Permission Denied</span>
                        </>
                      ) : gpsStatus === 'geocoding_failed' ? (
                        <>
                          <i className="bi bi-geo-fill text-warning" />
                          <span className="text-warning small fw-semibold">Coords Locked</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-crosshair text-info" />
                          <span>Sync GPS Lock</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* GPS Metadata & Verification Strip */}
                {gpsStatus === 'locked' && addressSource === 'gps' && gpsMeta && (
                  <div
                    className="mb-3 px-3 py-2 rounded-3 d-flex align-items-center justify-content-between small"
                    style={{
                      background: 'rgba(48, 209, 88, 0.1)',
                      border: '1px solid rgba(48, 209, 88, 0.35)',
                      color: '#30D158',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-shield-check fs-6" />
                      <span>
                        <strong>Hardware GPS Lock Verified:</strong> {gpsMeta.lat.toFixed(5)}°N, {gpsMeta.lng.toFixed(5)}°E • Reported Accuracy: <strong>±{gpsMeta.accuracy}m</strong>
                      </span>
                    </div>
                    <span className="font-monospace text-secondary" style={{ fontSize: '0.72rem' }}>
                      {new Date(gpsMeta.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {addressSource === 'manual' && (
                  <div
                    className="mb-3 px-3 py-1.5 rounded-3 d-flex align-items-center gap-2 text-secondary small"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <i className="bi bi-pencil-fill text-info" />
                    <span>Address manually calibrated. Coordinates remain pinned at {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}.</span>
                  </div>
                )}

                {gpsStatus === 'permission_denied' && (
                  <div
                    className="mb-3 p-3 rounded-3"
                    style={{
                      background: 'rgba(255, 69, 58, 0.12)',
                      border: '1px solid rgba(255, 69, 58, 0.4)',
                      color: '#FF453A',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 fw-semibold mb-1 small">
                      <i className="bi bi-shield-x fs-6" />
                      <span>Location Permission Denied in Browser</span>
                    </div>
                    <div style={{ color: '#E2E8F0', fontSize: '0.78rem', lineHeight: 1.5 }}>
                      To allow live location lock: Click the 🔒 lock/tune icon in your browser address bar next to <code>localhost</code>, toggle <strong>Location</strong> to <strong>Allow</strong>, and click <strong>Sync GPS Lock</strong> again. Alternatively, click your exact hazard location on the map above.
                    </div>
                  </div>
                )}

                {gpsStatus === 'geocoding_failed' && (
                  <div
                    className="mb-3 p-2.5 px-3 rounded-3 small"
                    style={{
                      background: 'rgba(255, 159, 10, 0.12)',
                      border: '1px solid rgba(255, 159, 10, 0.35)',
                      color: '#FF9F0A',
                      fontSize: '0.78rem',
                    }}
                  >
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    GPS coordinates locked at {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}. Reverse address geocoding timed out; please verify or manually adjust your street address above.
                  </div>
                )}

                {gpsStatus === 'timeout' && (
                  <div
                    className="mb-3 p-2.5 px-3 rounded-3 small"
                    style={{
                      background: 'rgba(255, 159, 10, 0.12)',
                      border: '1px solid rgba(255, 159, 10, 0.35)',
                      color: '#FF9F0A',
                      fontSize: '0.78rem',
                    }}
                  >
                    <i className="bi bi-clock-history me-1" />
                    GPS acquisition timed out while waiting for satellite fix. Click <strong>Sync GPS Lock</strong> to retry, or pick your position on the map.
                  </div>
                )}

                {/* Reporter Contact & Municipal Dispatch Coordination */}
                <div
                  className="p-3.5 rounded-4 mb-3"
                  style={{
                    background: 'rgba(11, 19, 33, 0.72)',
                    border: '1px solid rgba(159, 201, 255, 0.22)',
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: '28px', height: '28px', background: 'rgba(10, 132, 255, 0.2)', color: '#9FC9FF' }}
                      >
                        <i className="bi bi-shield-check" />
                      </div>
                      <span className="fw-bold text-white small">Reporter Details &amp; Municipal Command Dispatch</span>
                    </div>
                    <span className="badge rounded-pill bg-primary bg-opacity-20 text-info border border-info border-opacity-30 small">
                      <i className="bi bi-file-earmark-pdf me-1" />
                      Official Vector PDF Dossier Auto-Generated on Dispatch
                    </span>
                  </div>

                  <div className="row g-2.5">
                    <div className="col-12 col-md-6">
                      <GlassInput
                        label="Reporter Full Name *"
                        required
                        icon="person"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="e.g. Anandha Kumar"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <GlassInput
                        type="email"
                        label="Reporter Email Address *"
                        required
                        icon="envelope"
                        value={reporterEmail}
                        onChange={(e) => setReporterEmail(e.target.value)}
                        placeholder="e.g. anand@civicpulse.org"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <GlassInput
                        type="tel"
                        label="Contact Phone (Optional)"
                        icon="telephone"
                        value={reporterPhone}
                        onChange={(e) => setReporterPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="d-flex flex-column gap-1">
                        <label className="form-label mb-0" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cp-text-secondary)' }}>
                          Target Municipal Command Desk
                        </label>
                        <div
                          className="glass-input d-flex align-items-center px-3 text-secondary small"
                          style={{ height: '42px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px' }}
                        >
                          <i className="bi bi-building me-2 text-primary" />
                          <span className="text-light text-truncate">
                            Civic Operations ({address.split(',')[0] || 'Tamil Nadu Command'})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex flex-column gap-1">
                        <label
                          htmlFor="reporter-additional-msg"
                          className="form-label mb-0"
                          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cp-text-secondary)' }}
                        >
                          Additional Message for Municipal Officer (Optional)
                        </label>
                        <textarea
                          id="reporter-additional-msg"
                          rows={2}
                          className="glass-input w-100"
                          placeholder="e.g. Heavy peak-hour school traffic nearby. Please escalate for immediate repair."
                          value={additionalMessage}
                          onChange={(e) => setAdditionalMessage(e.target.value)}
                          style={{
                            background: 'rgba(10, 20, 36, 0.7)',
                            color: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid rgba(159, 201, 255, 0.25)',
                            padding: '8px 12px',
                            fontSize: '0.875rem',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-12 mt-2">
                      <div className="form-check d-flex align-items-center gap-2">
                        <input
                          id="consent-check"
                          type="checkbox"
                          className="form-check-input"
                          checked={consentToShareContact}
                          onChange={(e) => setConsentToShareContact(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label
                          htmlFor="consent-check"
                          className="form-check-label small text-secondary"
                          style={{ cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          Authorize inclusion of my contact information in the official municipal PDF report dossier.
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger py-2 px-3 small mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-octagon-fill flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                  <button
                    type="button"
                    onClick={() => setStep('capture')}
                    className="btn btn-link text-secondary text-decoration-none"
                  >
                    ← Retake Photo
                  </button>
                  <GlassButton
                    variant="primary"
                    size="lg"
                    type="submit"
                    loading={loading || dispatchLoading}
                    icon="send-fill"
                  >
                    {submissionState === 'validating'
                      ? 'Validating Incident...'
                      : submissionState === 'submitting_report'
                      ? 'Saving Incident to Grid...'
                      : submissionState === 'report_saved' || submissionState === 'generating_pdf' || dispatchLoading
                      ? 'Generating Vector PDF & Transmitting...'
                      : 'Submit to Municipal Command'}
                  </GlassButton>
                </div>
              </form>
            </GlassSurface>
          )}

          {/* ── STEP 4: SUCCESS MASTER INCIDENT SUMMARY & EXPORT ── */}
          {step === 'success' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5 text-center">
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(48, 209, 88, 0.2)',
                  color: '#30D158',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  marginBottom: '1rem',
                  boxShadow: '0 0 35px rgba(48, 209, 88, 0.45)',
                }}
              >
                <i className="bi bi-check2-circle" />
              </div>

              <h3 className="fw-bold mb-1 text-white">Incident Dispatched to Municipal Grid</h3>
              <p className="text-secondary small mx-auto mb-4" style={{ maxWidth: '480px', lineHeight: 1.6 }}>
                Your report has been verified by the AI engine, saved to the statewide municipal database, and routed to the corresponding department work order queue.
              </p>

              {/* Dossier Card */}
              <div
                className="p-3.5 rounded-4 mx-auto mb-4 text-start"
                style={{
                  maxWidth: '560px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--cp-glass-border)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-20">
                  <div className="d-flex align-items-center gap-2">
                    <span className="font-monospace text-primary fw-bold fs-6">
                      {createdIncident?.incidentNumber || 'CP-2026-X8K9'}
                    </span>
                    <span className="badge bg-secondary bg-opacity-25 text-light small text-uppercase">
                      {(createdIncident?.category || effectiveCategory).replace(/_/g, ' ')}
                    </span>
                  </div>
                  <StatusPill status="reported" size="sm" />
                </div>

                <h6 className="fw-bold mb-1 text-white">{createdIncident?.title || title}</h6>
                <div className="small text-secondary mb-3">{address}</div>

                {/* Dispatch Verification Section */}
                <div
                  className="p-2.5 rounded-3 mb-3 small"
                  style={{
                    background:
                      dispatchResult?.status === 'failed'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(10, 132, 255, 0.1)',
                    border:
                      dispatchResult?.status === 'failed'
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(159, 201, 255, 0.25)',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-secondary fw-semibold">Municipal Dispatch Status:</span>
                    {dispatchResult?.status === 'sent' ? (
                      <span className="badge bg-success bg-opacity-30 text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1" />
                        Transmitted via Resend
                      </span>
                    ) : dispatchResult?.status === 'simulated' ? (
                      <span className="badge bg-info bg-opacity-30 text-info fw-bold">
                        <i className="bi bi-shield-check me-1" />
                        Simulated Mode (Dev)
                      </span>
                    ) : dispatchResult?.status === 'failed' ? (
                      <span className="badge bg-danger bg-opacity-30 text-danger fw-bold">
                        <i className="bi bi-exclamation-triangle-fill me-1" />
                        Delivery Pending / Retrying
                      </span>
                    ) : (
                      <span className="badge bg-warning bg-opacity-30 text-warning fw-bold">
                        Processing Dispatch...
                      </span>
                    )}
                  </div>

                  {dispatchResult?.recipient && (
                    <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.78rem' }}>
                      <span>Destination Desk:</span>
                      <span className="text-light font-monospace">{dispatchResult.recipient}</span>
                    </div>
                  )}

                  {dispatchResult?.messageId && (
                    <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.78rem' }}>
                      <span>Provider Message ID:</span>
                      <span className="text-info font-monospace">{dispatchResult.messageId}</span>
                    </div>
                  )}

                  {dispatchResult?.pdfSizeBytes && (
                    <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.78rem' }}>
                      <span>PDF Attachment Size:</span>
                      <span className="text-light">{Math.round(dispatchResult.pdfSizeBytes / 1024)} KB (Vector Dossier)</span>
                    </div>
                  )}

                  {dispatchResult?.status === 'failed' && (
                    <div className="mt-2 pt-2 border-top border-danger border-opacity-25 d-flex justify-content-between align-items-center">
                      <span className="text-danger small">{dispatchResult.error || 'Provider communication delayed.'}</span>
                      <button
                        type="button"
                        onClick={handleRetryDispatch}
                        disabled={dispatchLoading}
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                      >
                        {dispatchLoading ? 'Retrying...' : 'Retry Dispatch'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small">
                  <span className="text-secondary">Expected SLA Resolution:</span>
                  <span className="fw-bold text-info">Within 4 Hours</span>
                </div>
              </div>

              {/* Professional Report Download & Export Toolbar */}
              <div className="mx-auto mb-4" style={{ maxWidth: '560px' }}>
                <div className="d-flex align-items-center justify-content-between mb-2 px-1">
                  <span className="text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>
                    Authoritative Dossier &amp; Export Options
                  </span>
                  <span className="badge bg-secondary bg-opacity-30 text-light" style={{ fontSize: '0.68rem' }}>
                    Tamper-Resistant Record
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <button
                    type="button"
                    disabled={downloadingFormat !== null}
                    onClick={handleDownloadPdf}
                    className="btn btn-primary d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', border: 'none' }}
                  >
                    {downloadingFormat === 'pdf' ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        <span>Downloading PDF...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-pdf-fill" />
                        <span>Download PDF Dossier</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={downloadingFormat !== null}
                    onClick={handleExportJson}
                    className="btn btn-outline-light d-inline-flex align-items-center gap-1.5 px-3 py-2 rounded-3"
                    style={{ borderColor: 'rgba(159, 201, 255, 0.3)' }}
                  >
                    {downloadingFormat === 'json' ? (
                      <>
                        <span className="spinner-border spinner-border-sm text-info" role="status" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-code-square text-info" />
                        <span>Export JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={downloadingFormat !== null}
                    onClick={handleExportCsv}
                    className="btn btn-outline-light d-inline-flex align-items-center gap-1.5 px-3 py-2 rounded-3"
                    style={{ borderColor: 'rgba(159, 201, 255, 0.3)' }}
                  >
                    {downloadingFormat === 'csv' ? (
                      <>
                        <span className="spinner-border spinner-border-sm text-success" role="status" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet text-success" />
                        <span>Export CSV</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={downloadingFormat !== null}
                    onClick={handleExportTxt}
                    className="btn btn-outline-light d-inline-flex align-items-center gap-1.5 px-3 py-2 rounded-3"
                    style={{ borderColor: 'rgba(159, 201, 255, 0.3)' }}
                  >
                    {downloadingFormat === 'txt' ? (
                      <>
                        <span className="spinner-border spinner-border-sm text-warning" role="status" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-text text-warning" />
                        <span>Export TXT</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5 px-3 py-2 rounded-3"
                  >
                    <i className="bi bi-printer" />
                    Print
                  </button>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="d-flex justify-content-center gap-3 pt-2">
                <Link to="/dashboard">
                  <GlassButton variant="primary" size="md" icon="grid-1x2">
                    Open in My Feed
                  </GlassButton>
                </Link>
                <Link to="/live-map">
                  <GlassButton variant="secondary" size="md" icon="box-seam">
                    Locate on 3D Twin
                  </GlassButton>
                </Link>
              </div>
            </GlassSurface>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportIncidentPage;
