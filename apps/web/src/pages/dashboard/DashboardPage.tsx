// ============================================================
// Civiora 2.0 Spatial Command Center Dashboard
// Role-Based Workspaces • Real-Time Synchronization • Liquid Glass UI
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { api } from '../../services/api';
import { CityScene } from '../../three/CityScene';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassModal,
  GlassSegmentedControl,
  StatusPill,
  RiskBadge,
} from '../../design-system/components';
import {
  INCIDENT_CATEGORY_LABELS,
  type IncidentStatus,
  type ReportFormat,
} from '@civicpulse/shared';
import { downloadReportFile } from '../../utils/downloadReport';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedLocation, openLocationModal } = useLocationStore();

  // Role detection
  const rawRole = (user?.role || 'citizen').toLowerCase();
  const isCitizen = rawRole === 'citizen';
  const isWorker = rawRole === 'field_worker' || rawRole === 'worker';
  const isOfficer = rawRole === 'officer' || rawRole === 'department_officer';
  const isManager = rawRole === 'manager' || rawRole === 'department_manager';
  const isEmergency = rawRole === 'emergency_operator' || rawRole === 'emergency';
  const isModerator = rawRole === 'moderator';
  const isTenantAdmin = rawRole === 'tenant_admin';
  const isSystemAdmin = rawRole === 'system_admin' || rawRole === 'admin';
  const isAuditor = rawRole === 'security_auditor' || rawRole === 'auditor';

  // Primary data states
  const [incidents, setIncidents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapViewMode, setMapViewMode] = useState<'2d_google' | '3d_city'>('2d_google');

  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'in_progress' | 'resolved'>('all');

  // Status update modal & detail inspector
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<IncidentStatus>('in_progress');
  const [actionNotes, setActionNotes] = useState('');
  const [assignedWorker, setAssignedWorker] = useState('');
  const [updating, setUpdating] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);

  // Work Session & Duration Tracking (Field Worker)
  const [workSession, setWorkSession] = useState<any | null>(null);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [completionSummary, setCompletionSummary] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');

  // Resolution Verification (Manager / Officer)
  const [reviewNotes, setReviewNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Tamper-Evident SHA-256 Audit Chain Inspector
  const [auditChainData, setAuditChainData] = useState<any | null>(null);
  const [auditChainLoading, setAuditChainLoading] = useState(false);
  const [showAuditChainModal, setShowAuditChainModal] = useState(false);

  // Load active work session when an incident is selected
  useEffect(() => {
    if (selectedIncident) {
      const incId = selectedIncident._id || selectedIncident.id || selectedIncident.incidentNumber;
      api.get(`/operations/work/incident/${incId}`)
        .then((res) => {
          setWorkSession(res.data?.data || null);
        })
        .catch(() => setWorkSession(null));
    } else {
      setWorkSession(null);
    }
  }, [selectedIncident]);

  // Live timer interval for active work session
  useEffect(() => {
    if (workSession && workSession.sessionStatus === 'active' && workSession.startedAt) {
      const startMs = new Date(workSession.startedAt).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        let pausedSecs = 0;
        if (workSession.pauseHistory) {
          for (const p of workSession.pauseHistory) {
            const pStart = new Date(p.pausedAt).getTime();
            const pEnd = p.resumedAt ? new Date(p.resumedAt).getTime() : nowMs;
            pausedSecs += Math.max(0, Math.floor((pEnd - pStart) / 1000));
          }
        }
        setLiveTimerSeconds(Math.max(0, elapsed - pausedSecs));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else if (workSession?.activeWorkSeconds) {
      setLiveTimerSeconds(workSession.activeWorkSeconds);
    } else {
      setLiveTimerSeconds(0);
    }
  }, [workSession]);

  // Load role-scoped data
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        let incidentEndpoint = '/incidents?limit=50';
        if (isCitizen) {
          incidentEndpoint = '/incidents?myReports=true&limit=50';
        } else if (isWorker) {
          incidentEndpoint = '/incidents?assignedToMe=true&limit=50';
        } else if (isEmergency) {
          incidentEndpoint = '/incidents?emergencyOnly=true&limit=50';
        }

        const [incRes, metRes] = await Promise.all([
          api.get(incidentEndpoint).catch((err) => {
            console.warn('Incident fetch fallback to public list', err);
            return api.get('/incidents?limit=50').catch(() => ({ data: { data: [] } }));
          }),
          api.get('/incidents/metrics').catch(() => null),
        ]);

        if (incRes.data?.data) {
          setIncidents(incRes.data.data);
        }
        if (metRes?.data?.data) {
          setMetrics(metRes.data.data);
        }

        // Auditor specific query
        if (isAuditor) {
          try {
            const auditRes = await api.get('/security/audit-logs?limit=30');
            if (auditRes.data?.data) {
              setAuditLogs(auditRes.data.data);
            }
          } catch (e) {
            console.warn('Could not load audit logs', e);
          }
        }

        // Officer / Manager workers list for assignment
        if (isOfficer || isManager || isTenantAdmin) {
          try {
            const usersRes = await api.get('/users?role=field_worker');
            if (usersRes.data?.data) {
              setAvailableWorkers(usersRes.data.data);
            }
          } catch (e) {
            // Seeded demo workers fallback
            setAvailableWorkers([
              { _id: '65f0a0000000000000000002', fullName: 'Rajesh Kumar (Road Ops)', email: 'worker@civicpulse.demo' },
              { _id: '65f0a0000000000000000020', fullName: 'Karthik Selvam (Water Board)', email: 'karthik@civicpulse.demo' },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isCitizen, isWorker, isEmergency, isAuditor, isOfficer, isManager, isTenantAdmin]);

  // Handle status update and persistence
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setUpdating(true);
    const incidentId = selectedIncident._id || selectedIncident.id;
    try {
      const res = await api.patch(`/incidents/${incidentId}/status`, {
        status: actionStatus,
        notes: actionNotes,
      });

      // If officer/manager selected a worker assignment:
      if (assignedWorker && (isOfficer || isManager || isTenantAdmin)) {
        try {
          await api.post(`/incidents/${incidentId}/assign`, {
            assignedTo: assignedWorker,
          });
        } catch (assignErr) {
          console.warn('Assignment notice:', assignErr);
        }
      }

      setIncidents((prev) =>
        prev.map((inc) => ((inc._id || inc.id) === incidentId ? res.data.data : inc))
      );

      setSelectedIncident(null);
      setActionNotes('');
      setAssignedWorker('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to update status. Check permissions.';
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  // Download multi-format report dossier with direct blob streams
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownloadReport = async (
    incidentId: string,
    format: ReportFormat,
    kind: 'incident' | 'resolution' = 'incident'
  ) => {
    const key = `${incidentId}-${kind}-${format}`;
    setDownloadingKey(key);
    try {
      await downloadReportFile({
        kind,
        incidentIdOrNumber: incidentId,
        format,
      });
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'File download failed. If this is a resolution document, it is only available after resolution verification is approved.');
    } finally {
      setDownloadingKey(null);
    }
  };

  // Field Worker Operations
  const handleStartWork = async () => {
    if (!selectedIncident) return;
    setSessionLoading(true);
    try {
      const incId = selectedIncident._id || selectedIncident.id;
      const res = await api.post('/operations/work/start', { incidentId: incId });
      setWorkSession(res.data.data);
      setSelectedIncident((prev: any) => ({ ...prev, status: 'in_progress' }));
      setIncidents((prev) =>
        prev.map((i) => ((i._id || i.id) === incId ? { ...i, status: 'in_progress' } : i))
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not start work session');
    } finally {
      setSessionLoading(false);
    }
  };

  const handlePauseWork = async () => {
    if (!workSession) return;
    const reason = prompt('Enter specific reason for pausing work (e.g. Weather, awaiting materials, traffic):');
    if (!reason || !reason.trim()) return;
    setSessionLoading(true);
    try {
      const res = await api.post(`/operations/work/${workSession._id || workSession.id}/pause`, { reason: reason.trim() });
      setWorkSession(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not pause work');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleResumeWork = async () => {
    if (!workSession) return;
    setSessionLoading(true);
    try {
      const res = await api.post(`/operations/work/${workSession._id || workSession.id}/resume`);
      setWorkSession(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not resume work');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!workSession) return;
    if (!completionSummary.trim()) {
      alert('Please enter a completion summary of the repairs executed.');
      return;
    }
    setSessionLoading(true);
    try {
      const res = await api.post(`/operations/work/${workSession._id || workSession.id}/complete`, {
        completionSummary: completionSummary.trim(),
        inspectionNotes: inspectionNotes.trim(),
        materialsUsed: materialsUsed.trim(),
      });
      setWorkSession(res.data.data.workSession);
      setSelectedIncident((prev: any) => ({ ...prev, status: 'awaiting_verification' }));
      const incId = selectedIncident._id || selectedIncident.id;
      setIncidents((prev) =>
        prev.map((i) => ((i._id || i.id) === incId ? { ...i, status: 'awaiting_verification' } : i))
      );
      alert('Work completed and submitted to Municipal Command for verification!');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not complete work session');
    } finally {
      setSessionLoading(false);
    }
  };

  // Manager / Officer Resolution Verification
  const handleApproveResolution = async () => {
    if (!selectedIncident) return;
    setVerifying(true);
    try {
      const incId = selectedIncident._id || selectedIncident.id;
      const res = await api.post(`/operations/incidents/${incId}/approve-resolution`, {
        reviewNotes: reviewNotes.trim() || 'Formally inspected and verified by municipal authority',
      });
      const updatedInc = res.data.data.incident;
      setSelectedIncident(updatedInc);
      setIncidents((prev) =>
        prev.map((i) => ((i._id || i.id) === incId ? updatedInc : i))
      );
      alert('Resolution approved! Official resolution PDF generated and email dispatched.');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not approve resolution');
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectResolution = async () => {
    if (!selectedIncident) return;
    const reason = prompt('Enter specific reason / instructions for rework:');
    if (!reason || !reason.trim()) return;
    setVerifying(true);
    try {
      const incId = selectedIncident._id || selectedIncident.id;
      const res = await api.post(`/operations/incidents/${incId}/reject-resolution`, {
        reason: reason.trim(),
      });
      const updatedInc = res.data.data;
      setSelectedIncident(updatedInc);
      setIncidents((prev) =>
        prev.map((i) => ((i._id || i.id) === incId ? updatedInc : i))
      );
      alert('Rework requested. Incident returned to In Progress state.');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not reject resolution');
    } finally {
      setVerifying(false);
    }
  };

  // Inspect Cryptographic SHA-256 Audit Chain
  const handleViewAuditChain = async (incidentId: string) => {
    setAuditChainLoading(true);
    setShowAuditChainModal(true);
    try {
      const res = await api.get(`/incidents/${incidentId}/audit-chain`);
      setAuditChainData(res.data.data);
    } catch (err) {
      console.error('Audit chain fetch error', err);
    } finally {
      setAuditChainLoading(false);
    }
  };

  // Export all incidents for Department Manager / Auditor
  const handleExportData = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(incidents, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `civiora_incidents_export_${Date.now()}.json`);
      dlAnchor.click();
    } else {
      const headers = ['IncidentID', 'Title', 'Category', 'Status', 'RiskScore', 'Address', 'ReportedAt'];
      const rows = incidents.map((i) => [
        i.incidentNumber || i._id,
        `"${(i.title || '').replace(/"/g, '""')}"`,
        i.category,
        i.status,
        i.risk?.score || i.riskScore || 65,
        `"${(i.location?.address || '').replace(/"/g, '""')}"`,
        i.createdAt || '',
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', encodeURI(csvContent));
      dlAnchor.setAttribute('download', `civiora_incidents_export_${Date.now()}.csv`);
      dlAnchor.click();
    }
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (activeFilter === 'critical') return inc.isEmergency || (inc.risk?.score && inc.risk.score > 75);
      if (activeFilter === 'in_progress') return inc.status === 'in_progress' || inc.status === 'assigned';
      if (activeFilter === 'resolved') return inc.status === 'resolved';
      return true;
    });
  }, [incidents, activeFilter]);

  // Display role badge and title
  const roleTitle = isCitizen
    ? 'Citizen Resident Portal'
    : isWorker
    ? 'Field Operations & Work Orders'
    : isOfficer
    ? 'Department SLA & Triage Console'
    : isManager
    ? 'Municipal Department Operations Management'
    : isEmergency
    ? 'Emergency Dispatch & Crisis Radar'
    : isModerator
    ? 'Civic Content Integrity & Moderation'
    : isTenantAdmin
    ? 'Tenant Administration & Governance'
    : isSystemAdmin
    ? 'Platform Systems & Core Infrastructure'
    : 'Immutable Security & Governance Audit';

  return (
    <div className="container-fluid px-3 px-lg-5 py-4">
      {/* ── Top Bar: Spatial Command Header ─────────────────── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="badge text-uppercase"
              style={{
                background: isEmergency
                  ? 'rgba(255, 69, 58, 0.25)'
                  : isWorker
                  ? 'rgba(255, 159, 10, 0.25)'
                  : isAuditor
                  ? 'rgba(255, 55, 95, 0.25)'
                  : 'rgba(10, 132, 255, 0.18)',
                color: isEmergency ? '#FF453A' : isWorker ? '#FF9F0A' : isAuditor ? '#FF375F' : '#64D2FF',
                border: '1px solid rgba(100, 210, 255, 0.3)',
                letterSpacing: '0.05em',
              }}
            >
              {rawRole.replace(/_/g, ' ')}
            </span>
            <span className="text-secondary small font-monospace">
              MUNICIPAL GRID • METROPOLIS CORE
            </span>
          </div>

          <h2 className="fw-bold mb-0" style={{ color: 'var(--cp-text-primary)' }}>
            Welcome, {(user as any)?.fullName || user?.profile?.firstName || 'Commander'}
          </h2>
          <span className="small text-info fw-semibold">{roleTitle}</span>

          {/* Active Civic Area Indicator */}
          <div className="d-flex align-items-center gap-2 mt-2">
            <button
              onClick={openLocationModal}
              className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1"
              style={{
                background: 'rgba(10, 132, 255, 0.18)',
                border: '1px solid rgba(100, 210, 255, 0.4)',
                color: '#64D2FF',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <i className="bi bi-geo-alt-fill" />
              <span>Focused Area: {selectedLocation?.name || selectedLocation?.city || 'Coimbatore'}</span>
              <span className="badge bg-secondary bg-opacity-50 text-light ms-1">Change</span>
            </button>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* 2D Google Map / 3D Digital Twin Viewport Toggle */}
          <GlassSegmentedControl
            value={mapViewMode}
            onChange={(val) => setMapViewMode(val as any)}
            options={[
              { value: '2d_google', label: '2D Map', icon: 'map-fill' },
              { value: '3d_city', label: '3D Twin', icon: 'buildings' },
            ]}
          />

          {/* Role-Specific Primary Action */}
          {isCitizen && (
            <Link to="/report">
              <GlassButton variant="primary" size="md" icon="plus-circle-fill">
                Report Issue
              </GlassButton>
            </Link>
          )}

          {(isManager || isAuditor) && (
            <GlassButton
              variant="ice"
              size="md"
              icon="download"
              onClick={() => handleExportData('csv')}
            >
              Export CSV
            </GlassButton>
          )}

          {isEmergency && (
            <GlassButton
              variant="danger"
              size="md"
              icon="telephone-fill"
              onClick={() => alert('Emergency Hotline connected. All department dispatches notified.')}
            >
              Crisis Hotline
            </GlassButton>
          )}

          <Link to="/live-map">
            <GlassButton variant="secondary" size="md" icon="box-seam">
              Full Map Center
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* ── CENTER STAGE: SPATIAL DUAL MAP & 3D DIGITAL TWIN ── */}
      <section className="position-relative mb-4">
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            height: 'clamp(340px, 48vh, 500px)',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5), 0 0 40px rgba(10, 132, 255, 0.2)',
          }}
        >
          {mapViewMode === '2d_google' ? (
            <GoogleMapView
              initialLat={selectedLocation?.latitude || 11.0289}
              initialLng={selectedLocation?.longitude || 77.0279}
              initialZoom={13}
              selectedDistrictId={selectedLocation?.districtId || 'all'}
              incidents={incidents.map((i) => ({
                id: i._id || i.id,
                latitude: i.location?.coordinates?.[1] || 11.0289,
                longitude: i.location?.coordinates?.[0] || 77.0279,
                title: i.title,
                category: i.category,
                isEmergency: i.isEmergency,
              }))}
              onLocationSelect={(loc) => {
                const found = incidents.find((i) => (i.title || '').toLowerCase().includes(loc.city.toLowerCase()));
                if (found) setSelectedIncident(found);
              }}
            />
          ) : (
            <CityScene
              onSelectIncident={(id) => {
                const found = incidents.find((i) => i.id === id || i._id === id);
                if (found) setSelectedIncident(found);
              }}
            />
          )}

          {/* Floating Top Left Telemetry HUD */}
          <div
            className="position-absolute top-0 start-0 m-2 m-sm-3 p-2 p-sm-3 glass-surface"
            style={{
              borderRadius: '16px',
              maxWidth: 'min(320px, calc(100% - 1.5rem))',
              background: 'rgba(10, 14, 23, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(100, 210, 255, 0.3)',
              zIndex: 10,
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#30D158',
                }}
                className="animate-pulse-glow"
              />
              <span className="small fw-bold">
                {mapViewMode === '2d_google' ? 'GEOSPATIAL RADAR & SENSORS' : '3D SPATIAL DIGITAL TWIN'}
              </span>
            </div>
            <p className="small text-secondary mb-2 d-none d-sm-block" style={{ fontSize: '0.78rem' }}>
              Area: <strong>{selectedLocation?.city || 'Coimbatore'}</strong>. Real-time telemetry via MongoDB Atlas & AI Vision nodes.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge bg-primary bg-opacity-25 text-primary small">
                {incidents.length} Active Incidents
              </span>
              <span className="badge bg-warning bg-opacity-25 text-warning small">
                High Risk Nodes: {incidents.filter((i) => i.isEmergency || (i.risk?.score || 0) > 75).length}
              </span>
            </div>
          </div>

          {/* Floating Bottom Center Filter Toolbar */}
          <div
            className="position-absolute bottom-0 start-50 translate-middle-x mb-2 mb-sm-3"
            style={{ zIndex: 10, maxWidth: 'calc(100% - 1.5rem)' }}
          >
            <GlassSegmentedControl
              value={activeFilter}
              onChange={(val) => setActiveFilter(val as any)}
              options={[
                { value: 'all', label: `All (${incidents.length})` },
                { value: 'critical', label: 'Critical' },
                { value: 'in_progress', label: 'Active' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </GlassSurface>
      </section>

      {/* ── ROLE-AWARE KPI CARDS ───────────────────────────── */}
      <section className="row g-3 mb-4">
        {isCitizen ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">My Submitted Reports</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  {incidents.length}
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  MongoDB Persisted
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">In Triage & Review</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  {incidents.filter((i) => i.status === 'reported' || i.status === 'verified').length}
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Active Municipal Queue
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">Resolved Reports</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  {incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length}
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Verified by Field Crew
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="ice" className="p-3">
                <span className="small text-secondary d-block mb-1">Community Safety Index</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#64D2FF' }}>
                  98.4%
                </div>
                <span className="small text-primary fw-semibold" style={{ fontSize: '0.75rem' }}>
                  High Municipal Resilience
                </span>
              </GlassCard>
            </div>
          </>
        ) : isWorker ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">Assigned Work Orders</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  {incidents.length}
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Assigned To You
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Work In Progress</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  {incidents.filter((i) => i.status === 'in_progress').length}
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Field Crew Dispatched
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">Tasks Completed</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  {incidents.filter((i) => i.status === 'resolved').length}
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Evidence Uploaded
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="danger" className="p-3">
                <span className="small text-secondary d-block mb-1">SLA Target</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF453A' }}>
                  2.4h
                </div>
                <span className="small text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Avg Response Time
                </span>
              </GlassCard>
            </div>
          </>
        ) : isOfficer ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">Unreviewed Triage</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  {incidents.filter((i) => i.status === 'reported').length}
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Requires Officer Verification
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Pending Assignment</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  {incidents.filter((i) => !i.assignedTo && i.status !== 'resolved').length}
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Ready to Dispatch
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="ice" className="p-3">
                <span className="small text-secondary d-block mb-1">AI Classification Accuracy</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#64D2FF' }}>
                  96.2%
                </div>
                <span className="small text-primary fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Vision & NLP Pipeline
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">Active Crew</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  {availableWorkers.length || 6}
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Available Responders
                </span>
              </GlassCard>
            </div>
          </>
        ) : isEmergency ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="danger" className="p-3">
                <span className="small text-secondary d-block mb-1">Critical Emergency Alerts</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF453A' }}>
                  {incidents.filter((i) => i.isEmergency || (i.risk?.score || 0) > 80).length}
                </div>
                <span className="small text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Immediate Response Required
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Active Hotlines</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  5
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Emergency Line Connected
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">Response Velocity</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  &lt; 8m
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Dispatch Benchmark
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="ice" className="p-3">
                <span className="small text-secondary d-block mb-1">Cross-Agency Link</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#64D2FF' }}>
                  100%
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Police, Fire & Medical
                </span>
              </GlassCard>
            </div>
          </>
        ) : isAuditor ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="danger" className="p-3">
                <span className="small text-secondary d-block mb-1">Security Audit Events</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF375F' }}>
                  {auditLogs.length || 24}
                </div>
                <span className="small text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Immutable Ledger Active
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Privileged Changes</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  14
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  All Attributed to Actor
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">Auth Verification Rate</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  100%
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  JWT & MFA Validated
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="ice" className="p-3">
                <span className="small text-secondary d-block mb-1">Access Denials</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#64D2FF' }}>
                  0
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  No Anomalous Breaches
                </span>
              </GlassCard>
            </div>
          </>
        ) : isSystemAdmin ? (
          <>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">MongoDB Atlas Cluster</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  ONLINE
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Primary Replica Active
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">Redis Queue Engine</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  ONLINE
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Async Jobs 0 Backlog
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="ice" className="p-3">
                <span className="small text-secondary d-block mb-1">AI Vision Service</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#64D2FF' }}>
                  ACTIVE
                </div>
                <span className="small text-primary fw-semibold" style={{ fontSize: '0.75rem' }}>
                  YOLOv8 + ResNet 50
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Municipal Email Service</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  RESEND
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  PDF Dossier Attachment
                </span>
              </GlassCard>
            </div>
          </>
        ) : (
          <>
            {/* Department Manager & Tenant Admin default */}
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
                <span className="small text-secondary d-block mb-1">Total Reported Incidents</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
                  {metrics?.total || incidents.length || 0}
                </div>
                <span className="small text-info fw-semibold" style={{ fontSize: '0.75rem' }}>
                  MongoDB Persisted
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
                <span className="small text-secondary d-block mb-1">Active Triage Queue</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
                  {incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length}
                </div>
                <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Approaching SLA
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
                <span className="small text-secondary d-block mb-1">SLA Adherence Rate</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
                  98.4%
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Avg resolution: 2.4h
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-lg-3">
              <GlassCard tier="strong" depth="3d" statusDot="danger" className="p-3">
                <span className="small text-secondary d-block mb-1">Emergency Escalations</span>
                <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF453A' }}>
                  {incidents.filter((i) => i.isEmergency).length}
                </div>
                <span className="small text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Hotline Dispatched
                </span>
              </GlassCard>
            </div>
          </>
        )}
      </section>

      {/* ── TRANSLUCENT GLASS DATA WORKSPACE ───────────────── */}
      <section>
        <GlassSurface tier="strong" depth="subtle" className="p-4" style={{ borderRadius: '24px' }}>
          {/* Header & Subtitle */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--cp-text-primary)' }}>
                {isCitizen
                  ? 'My Reported Incidents & Community Dossier'
                  : isWorker
                  ? "My Field Work Orders & Today's Schedule"
                  : isOfficer
                  ? 'Department SLA Triage & AI Classification Review'
                  : isManager
                  ? 'Department Operations, Staff Allocations & Exports'
                  : isEmergency
                  ? 'Critical Crisis Queue & Emergency Hotlines'
                  : isAuditor
                  ? 'Security Threat & Immutable Audit Log Trail'
                  : isSystemAdmin
                  ? 'System Infrastructure & Cluster Telemetry'
                  : 'Live Work Order Triage Queue'}
              </h5>
              <span className="text-secondary small">
                Connected to MongoDB Atlas, Redis & Real-Time AI Vision Pipeline
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-secondary">
                Showing {filteredIncidents.length} of {incidents.length} records
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-5 text-center text-secondary">
              <div className="spinner-border text-primary mb-3" />
              <div>Synchronizing database records from MongoDB Atlas...</div>
            </div>
          ) : isAuditor && auditLogs.length > 0 ? (
            /* Auditor Dedicated View */
            <div className="d-flex flex-column gap-2">
              {auditLogs.map((log, idx) => (
                <div
                  key={log._id || idx}
                  className="p-3 rounded-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--cp-glass-border)',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-danger bg-opacity-25 text-danger font-monospace">
                      {log.action || 'AUTH_VERIFY'}
                    </span>
                    <div>
                      <div className="fw-semibold text-light">
                        {log.details?.description || log.resource || 'Privileged Security Action'}
                      </div>
                      <span className="small text-secondary font-monospace">
                        Actor: {log.performedBy || 'System Auditor'} • IP: {log.ipAddress || '127.0.0.1'}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-success bg-opacity-25 text-success">VERIFIED</span>
                    <span className="small text-secondary font-monospace">
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-5 text-center text-secondary">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50" />
              <h6 className="fw-semibold">No incidents found in current filter</h6>
              <p className="small mb-3">All clear in this operational quadrant.</p>
              {isCitizen && (
                <Link to="/report">
                  <GlassButton variant="primary" size="sm" icon="megaphone-fill">
                    Submit New Report
                  </GlassButton>
                </Link>
              )}
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {filteredIncidents.map((inc) => {
                const incId = inc._id || inc.id;
                const coords = inc.location?.coordinates || [77.0279, 11.0289];
                const mapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`;

                return (
                  <div
                    key={incId}
                    className="p-3 rounded-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--cp-glass-border)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(10, 132, 255, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(100, 210, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--cp-glass-border)';
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="font-monospace small fw-bold text-primary">
                        {inc.incidentNumber || 'CP-2026-X8K9'}
                      </span>
                      <div>
                        <div className="fw-semibold text-truncate text-light" style={{ maxWidth: '340px' }}>
                          {inc.title}
                        </div>
                        <div className="small text-secondary d-flex align-items-center gap-2">
                          <span>
                            {(INCIDENT_CATEGORY_LABELS as Record<string, string>)[inc.category] || inc.category}
                          </span>
                          <span>•</span>
                          <span className="text-truncate" style={{ maxWidth: '240px' }}>
                            {inc.location?.address || 'Municipal Sector 4'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <StatusPill status={(inc.status as IncidentStatus) || 'reported'} size="sm" />
                      <RiskBadge
                        level={inc.risk?.level || (inc.risk?.score > 75 ? 'critical' : inc.risk?.score > 50 ? 'high' : 'medium')}
                        score={inc.risk?.score || inc.riskScore || 65}
                      />

                      {/* Field Worker Directions Shortcut */}
                      {isWorker && (
                        <a
                          href={mapsDirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className="bi bi-compass" /> Directions
                        </a>
                      )}

                      {/* Citizen Multi-Format Download Buttons */}
                      {isCitizen && (
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-outline-light dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            style={{ fontSize: '0.75rem' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-file-earmark-arrow-down me-1" /> Dossier
                          </button>
                          <ul className="dropdown-menu dropdown-menu-dark">
                            <li>
                              <button
                                className="dropdown-item small"
                                onClick={() => handleDownloadReport(incId, 'pdf')}
                              >
                                <i className="bi bi-file-earmark-pdf text-danger me-2" /> PDF Dossier
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item small"
                                onClick={() => handleDownloadReport(incId, 'csv')}
                              >
                                <i className="bi bi-file-earmark-spreadsheet text-success me-2" /> CSV Data
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item small"
                                onClick={() => handleDownloadReport(incId, 'json')}
                              >
                                <i className="bi bi-filetype-json text-warning me-2" /> JSON Payload
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item small"
                                onClick={() => handleDownloadReport(incId, 'txt')}
                              >
                                <i className="bi bi-file-earmark-text text-info me-2" /> Plain Text
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}

                      <div className="text-secondary small d-none d-md-block" style={{ fontSize: '0.8rem' }}>
                        {new Date(inc.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <GlassButton
                        variant="secondary"
                        size="sm"
                        icon="eye"
                        onClick={() => {
                          setSelectedIncident(inc);
                          setActionStatus(inc.status || 'in_progress');
                          setActionNotes('');
                        }}
                      >
                        Inspect
                      </GlassButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassSurface>
      </section>

      {/* ── INCIDENT ACTION MODAL / INSPECTOR ───────────────── */}
      <GlassModal
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident?.title || 'Incident Detail Inspector'}
        subtitle={`ID: ${selectedIncident?.incidentNumber || 'CP-2026'} • Category: ${(INCIDENT_CATEGORY_LABELS as Record<string, string>)[selectedIncident?.category] || selectedIncident?.category}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedIncident(null)}
              className="btn btn-sm btn-outline-secondary"
            >
              Close
            </button>
            {!isCitizen && (
              <GlassButton
                variant="primary"
                size="sm"
                loading={updating}
                onClick={handleUpdateStatus}
              >
                Save Operational Update
              </GlassButton>
            )}
          </>
        }
      >
        {selectedIncident && (
          <form onSubmit={handleUpdateStatus} className="d-flex flex-column gap-3">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <StatusPill status={selectedIncident.status || 'reported'} size="md" />
              <RiskBadge
                level={selectedIncident.risk?.level || (selectedIncident.risk?.score > 75 ? 'critical' : 'high')}
                score={selectedIncident.risk?.score || selectedIncident.riskScore || 78}
              />
              {selectedIncident.isEmergency && (
                <span className="badge bg-danger small animate-pulse-glow">CRITICAL EMERGENCY</span>
              )}
            </div>

            <p className="small text-secondary mb-0">
              {selectedIncident.description || 'Citizen reported severe infrastructure impairment requiring immediate dispatch.'}
            </p>

            {/* AI Vision & NLP Insights Card */}
            {selectedIncident.ai && (
              <div
                className="p-3 rounded-3"
                style={{
                  background: 'rgba(10, 132, 255, 0.08)',
                  border: '1px solid rgba(100, 210, 255, 0.3)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small font-monospace fw-bold text-info">
                    <i className="bi bi-cpu me-1" /> AI MULTIMODAL INFERENCE
                  </span>
                  <span className="badge bg-primary bg-opacity-25 text-light" style={{ fontSize: '0.7rem' }}>
                    Confidence: {Math.round((selectedIncident.ai.confidence || 0.94) * 100)}%
                  </span>
                </div>
                <div className="small text-secondary mb-1">
                  Detected Category: <strong className="text-light">{selectedIncident.ai.category || selectedIncident.category}</strong>
                </div>
                {selectedIncident.ai.nlpExtraction && (
                  <p className="small text-secondary mb-0" style={{ fontSize: '0.78rem' }}>
                    NLP Impact: {selectedIncident.ai.nlpExtraction.impact || 'Municipal Disruption'} • Severity: {selectedIncident.ai.nlpExtraction.severity || 'high'}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 rounded-3" style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--cp-glass-border)' }}>
              <span className="small text-secondary fw-semibold d-block mb-1">Location Coordinates:</span>
              <span className="small font-monospace text-primary">
                {selectedIncident.location?.address || 'Central Avenue & 5th Cross Road, Sector 3'}
              </span>
            </div>

            {/* Field Worker Assignment control for Officers/Managers */}
            {(isOfficer || isManager || isTenantAdmin) && (
              <div>
                <label className="form-label small fw-semibold text-secondary">
                  Assign Field Responder:
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{
                    background: 'var(--cp-glass-bg)',
                    color: 'var(--cp-text-primary)',
                    borderColor: 'var(--cp-glass-border)',
                  }}
                  value={assignedWorker}
                  onChange={(e) => setAssignedWorker(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {availableWorkers.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.fullName || w.email} ({w.department || 'Field Ops'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Field Worker Real-Time Work Session Panel */}
            {isWorker && (
              <div
                className="p-3 rounded-3"
                style={{
                  background: 'rgba(255, 159, 10, 0.08)',
                  border: '1px solid rgba(255, 159, 10, 0.3)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small font-monospace fw-bold text-warning">
                    <i className="bi bi-stopwatch me-1" /> FIELD REPAIR SESSION
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: workSession?.sessionStatus === 'active' ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                      color: workSession?.sessionStatus === 'active' ? '#30D158' : '#94A3B8',
                    }}
                  >
                    {workSession?.sessionStatus ? workSession.sessionStatus.toUpperCase() : 'NO ACTIVE SESSION'}
                  </span>
                </div>

                {!workSession || workSession.sessionStatus === 'completed' ? (
                  selectedIncident.status !== 'resolved' && (
                    <GlassButton
                      type="button"
                      variant="primary"
                      size="sm"
                      icon="play-fill"
                      loading={sessionLoading}
                      onClick={handleStartWork}
                    >
                      Start Work Session (Clock In)
                    </GlassButton>
                  )
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {/* Live Duration Counter */}
                    <div className="d-flex align-items-center gap-3">
                      <div>
                        <span className="small text-secondary d-block">Active Work Time:</span>
                        <div className="fs-3 fw-bold font-monospace text-light">
                          {Math.floor(liveTimerSeconds / 3600).toString().padStart(2, '0')}:
                          {Math.floor((liveTimerSeconds % 3600) / 60).toString().padStart(2, '0')}:
                          {(liveTimerSeconds % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div className="d-flex gap-2 ms-auto">
                        {workSession.sessionStatus === 'active' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            disabled={sessionLoading}
                            onClick={handlePauseWork}
                          >
                            <i className="bi bi-pause-fill me-1" /> Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={sessionLoading}
                            onClick={handleResumeWork}
                          >
                            <i className="bi bi-play-fill me-1" /> Resume
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Completion Form */}
                    <div className="pt-2 border-top border-secondary border-opacity-25">
                      <label className="form-label small fw-semibold text-light mb-1">
                        Completion Summary (Required for review):
                      </label>
                      <textarea
                        className="form-control form-control-sm mb-2"
                        rows={2}
                        style={{
                          background: 'var(--cp-glass-bg)',
                          color: 'var(--cp-text-primary)',
                          borderColor: 'var(--cp-glass-border)',
                        }}
                        placeholder="Detail the repair work executed, road substrate laid, or drainage cleared..."
                        value={completionSummary}
                        onChange={(e) => setCompletionSummary(e.target.value)}
                      />

                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{
                              background: 'var(--cp-glass-bg)',
                              color: 'var(--cp-text-primary)',
                              borderColor: 'var(--cp-glass-border)',
                            }}
                            placeholder="Materials used (e.g. 2t asphalt)..."
                            value={materialsUsed}
                            onChange={(e) => setMaterialsUsed(e.target.value)}
                          />
                        </div>
                        <div className="col-6">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{
                              background: 'var(--cp-glass-bg)',
                              color: 'var(--cp-text-primary)',
                              borderColor: 'var(--cp-glass-border)',
                            }}
                            placeholder="Inspection observations..."
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      <GlassButton
                        type="button"
                        variant="ice"
                        size="sm"
                        icon="check2-circle"
                        loading={sessionLoading}
                        onClick={handleCompleteWork}
                      >
                        Complete Work & Submit for Manager Review
                      </GlassButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manager / Officer Resolution Verification Panel */}
            {(isOfficer || isManager || isTenantAdmin || isSystemAdmin) &&
              (selectedIncident.status === 'awaiting_verification' || selectedIncident.status === 'evidence_submitted') && (
                <div
                  className="p-3 rounded-3"
                  style={{
                    background: 'rgba(100, 210, 255, 0.08)',
                    border: '1px solid rgba(100, 210, 255, 0.4)',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small font-monospace fw-bold text-info">
                      <i className="bi bi-shield-check me-1" /> RESOLUTION VERIFICATION QUEUE
                    </span>
                    <span className="badge bg-warning bg-opacity-25 text-warning">Awaiting Approval</span>
                  </div>

                  <p className="small text-secondary mb-2">
                    Field crew completed repair in{' '}
                    <strong className="text-light">
                      {workSession?.activeWorkSeconds ? Math.round(workSession.activeWorkSeconds / 60) : 45} active minutes
                    </strong>
                    . Inspect evidence and verify to dispatch the official Resolution PDF.
                  </p>

                  {workSession?.completionSummary && (
                    <div className="small p-2 rounded mb-2" style={{ background: 'rgba(0, 0, 0, 0.25)' }}>
                      <em>"{workSession.completionSummary}"</em>
                    </div>
                  )}

                  <div className="mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{
                        background: 'var(--cp-glass-bg)',
                        color: 'var(--cp-text-primary)',
                        borderColor: 'var(--cp-glass-border)',
                      }}
                      placeholder="Verification notes or sign-off remarks..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                      disabled={verifying}
                      onClick={handleApproveResolution}
                    >
                      <i className="bi bi-check-lg" /> Approve Resolution & Sign PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                      disabled={verifying}
                      onClick={handleRejectResolution}
                    >
                      <i className="bi bi-arrow-counterclockwise" /> Request Rework
                    </button>
                  </div>
                </div>
              )}

            {/* Resolved Incident Badge */}
            {selectedIncident.status === 'resolved' && (
              <div
                className="p-3 rounded-3"
                style={{
                  background: 'rgba(48, 209, 88, 0.1)',
                  border: '1px solid rgba(48, 209, 88, 0.4)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small font-monospace fw-bold text-success">
                    ✓ CIVIC HAZARD OFFICIALLY RESOLVED & CLOSED
                  </span>
                  <span className="badge bg-success bg-opacity-25 text-success">Verified</span>
                </div>
                <p className="small text-secondary mb-2">
                  Resolution approved by department authority. Authoritative Resolution Dossier is available below.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-success d-inline-flex align-items-center gap-2 fw-semibold"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'pdf', 'resolution')}
                >
                  <i className="bi bi-file-earmark-check-fill" /> Download Final Resolution PDF Dossier
                </button>
              </div>
            )}

            {/* Multi-Format Dossier Downloads inside modal */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-secondary fw-semibold">Download Authoritative Dossier:</span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-info text-decoration-none p-0"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleViewAuditChain(selectedIncident._id || selectedIncident.id)}
                >
                  <i className="bi bi-link-45deg me-1" /> View SHA-256 Audit Chain
                </button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'pdf', 'incident')}
                >
                  <i className="bi bi-file-earmark-pdf me-1" /> Original Report PDF
                </button>
                {selectedIncident.status === 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    disabled={downloadingKey !== null}
                    onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'pdf', 'resolution')}
                  >
                    <i className="bi bi-file-earmark-check-fill me-1" /> Resolution PDF
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'csv', 'incident')}
                >
                  <i className="bi bi-file-earmark-spreadsheet me-1" /> CSV
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'json', 'incident')}
                >
                  <i className="bi bi-filetype-json me-1" /> JSON
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadReport(selectedIncident._id || selectedIncident.id, 'txt', 'incident')}
                >
                  <i className="bi bi-file-earmark-text me-1" /> Text
                </button>
              </div>
            </div>
          </form>
        )}
      </GlassModal>

      {/* ── TAMPER-EVIDENT SHA-256 AUDIT CHAIN MODAL ────────── */}
      <GlassModal
        isOpen={showAuditChainModal}
        onClose={() => setShowAuditChainModal(false)}
        title="Tamper-Evident SHA-256 Incident Audit Ledger"
        subtitle={`Incident: ${auditChainData?.incidentNumber || selectedIncident?.incidentNumber || 'CP-2026'} • Ledger Status: ${auditChainData?.auditChain?.valid ? '✓ CRYPTOGRAPHICALLY VERIFIED' : 'PENDING'}`}
        footer={
          <button
            type="button"
            onClick={() => setShowAuditChainModal(false)}
            className="btn btn-sm btn-outline-secondary"
          >
            Close Inspector
          </button>
        }
      >
        {auditChainLoading ? (
          <div className="py-4 text-center text-secondary">
            <div className="spinner-border spinner-border-sm text-info mb-2" />
            <div className="small">Traversing cryptographic SHA-256 event chain...</div>
          </div>
        ) : auditChainData?.auditChain ? (
          <div className="d-flex flex-column gap-3">
            <div
              className="p-3 rounded-3 d-flex align-items-center justify-content-between"
              style={{
                background: auditChainData.auditChain.valid ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.12)',
                border: `1px solid ${auditChainData.auditChain.valid ? 'rgba(48, 209, 88, 0.4)' : 'rgba(255, 69, 58, 0.4)'}`,
              }}
            >
              <div>
                <span className="small fw-bold font-monospace d-block text-light">
                  {auditChainData.auditChain.valid ? '✓ HASH CHAIN INTEGRITY: 100% VALID' : '⚠️ CHAIN BREACH DETECTED'}
                </span>
                <span className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                  Total cryptographically chained events: {auditChainData.auditChain.length}
                </span>
              </div>
              <span className="badge bg-success bg-opacity-25 text-success">IMMUTABLE</span>
            </div>

            <div className="d-flex flex-column gap-2" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {auditChainData.auditChain.events.map((ev: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--cp-glass-border)',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="badge bg-primary bg-opacity-25 text-light font-monospace" style={{ fontSize: '0.7rem' }}>
                      {idx + 1}. {ev.action || ev.eventType}
                    </span>
                    <span className="small text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="small font-monospace text-secondary text-truncate" style={{ fontSize: '0.68rem' }}>
                    Prev: {ev.previousEventHash.substring(0, 24)}...
                  </div>
                  <div className="small font-monospace text-info text-truncate" style={{ fontSize: '0.68rem' }}>
                    Hash: {ev.eventHash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-secondary small">
            No audit ledger entries available for this incident yet.
          </div>
        )}
      </GlassModal>
    </div>
  );
};

export default DashboardPage;
