// ============================================================
// CivicPulse 3D Urban Risk Globe (Three.js + React Three Fiber)
// Global & Municipal Multi-Zone Predictive Intelligence Visualizer
// ============================================================

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

export interface GlobeZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskScore: number;
  activeIncidents: number;
  category: 'critical' | 'flood' | 'structural' | 'predictive';
  predictionSnippet: string;
}

export const DEMO_GLOBE_ZONES: GlobeZone[] = [
  {
    id: 'zone-1',
    name: 'Metropolis Central Plaza',
    lat: 12.9716,
    lng: 77.5946,
    riskScore: 88,
    activeIncidents: 42,
    category: 'critical',
    predictionSnippet: 'Severe traffic congestion & storm runoff alert.',
  },
  {
    id: 'zone-2',
    name: 'Sector 4 Industrial Riverfront',
    lat: 28.6139,
    lng: 77.209,
    riskScore: 94,
    activeIncidents: 68,
    category: 'flood',
    predictionSnippet: 'Water table cresting past safe flood embankments in 4h.',
  },
  {
    id: 'zone-3',
    name: 'Tech Corridor & High-Rise District',
    lat: 19.076,
    lng: 72.8777,
    riskScore: 62,
    activeIncidents: 19,
    category: 'structural',
    predictionSnippet: 'Moderate road settlement detected via satellite InSAR.',
  },
  {
    id: 'zone-4',
    name: 'East Harbor Logistics Zone',
    lat: 13.0827,
    lng: 80.2707,
    riskScore: 78,
    activeIncidents: 35,
    category: 'predictive',
    predictionSnippet: 'AI forecasting 73% probability of drainage blockage.',
  },
  {
    id: 'zone-5',
    name: 'North Valley Residential Sector',
    lat: 22.5726,
    lng: 88.3639,
    riskScore: 45,
    activeIncidents: 8,
    category: 'structural',
    predictionSnippet: 'Standard routine municipal maintenance SLA within normal bounds.',
  },
];

// Helper: Convert Lat/Lng to 3D Cartesian Coordinate on Sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// ── Holographic Wireframe Core ──────────────────────────────
function HolographicSphere() {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Translucent Dark Inner Sphere */}
      <mesh>
        <sphereGeometry args={[4.95, 48, 48]} />
        <meshStandardMaterial
          color="#050A14"
          roughness={0.12}
          metalness={0.92}
          transparent
          opacity={0.94}
        />
      </mesh>

      {/* Geodesic Hexagonal Wireframe Shell */}
      <mesh>
        <icosahedronGeometry args={[5, 4]} />
        <meshBasicMaterial
          color="#527FC7"
          wireframe
          transparent
          opacity={0.28}
        />
      </mesh>

      {/* Equatorial & Latitude Hologram Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.05, 5.08, 64]} />
        <meshBasicMaterial color="#9FC9FF" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.5, 0]}>
        <ringGeometry args={[4.3, 4.33, 64]} />
        <meshBasicMaterial color="#527FC7" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <ringGeometry args={[4.3, 4.33, 64]} />
        <meshBasicMaterial color="#527FC7" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Atmospheric Glow Halo ───────────────────────────────────
function AtmosphericGlow() {
  return (
    <mesh>
      <sphereGeometry args={[5.35, 32, 32]} />
      <meshBasicMaterial
        color="#527FC7"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ── Interactive Spatial Zone Beacon on Sphere ───────────────
function ZonePin({
  zone,
  isSelected,
  onSelect,
}: {
  zone: GlobeZone;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pos = useMemo(() => latLngToVector3(zone.lat, zone.lng, 5.1), [zone.lat, zone.lng]);
  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const q = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quaternion;
  }, [normal]);

  const pinColor =
    zone.category === 'critical'
      ? '#FF453A'
      : zone.category === 'flood'
      ? '#0A84FF'
      : zone.category === 'predictive'
      ? '#BF5AF2'
      : '#FF9F0A';

  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (pulseRef.current) {
      const s = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.4;
      pulseRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={pos} quaternion={q} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Light Spike pointing outward */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshBasicMaterial color={pinColor} transparent opacity={0.8} />
      </mesh>

      {/* Floating Diamond Indicator */}
      <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
        <mesh position={[0, 1.35, 0]}>
          <octahedronGeometry args={[isSelected ? 0.35 : 0.22]} />
          <meshStandardMaterial
            color={pinColor}
            emissive={pinColor}
            emissiveIntensity={isSelected ? 1.5 : 0.8}
          />
        </mesh>
      </Float>

      {/* Surface Radar Ring */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.2, 0.35, 24]} />
        <meshBasicMaterial color={pinColor} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Great-Circle Connecting Arcs Between Zones ──────────────
function ConnectingArc({ start, end }: { start: GlobeZone; end: GlobeZone }) {
  const lineObj = useMemo(() => {
    const v1 = latLngToVector3(start.lat, start.lng, 5.1);
    const v2 = latLngToVector3(end.lat, end.lng, 5.1);

    const mid = v1.clone().add(v2).multiplyScalar(0.5);
    const dist = v1.distanceTo(v2);
    mid.normalize().multiplyScalar(5.1 + dist * 0.25);

    const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
    const points = curve.getPoints(36);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#64D2FF',
      transparent: true,
      opacity: 0.4,
    });

    return new THREE.Line(geometry, material);
  }, [start, end]);

  return <primitive object={lineObj} />;
}

// ── Main Urban Risk Globe Component ─────────────────────────
export interface UrbanRiskGlobeProps {
  onSelectZone?: (zone: GlobeZone) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const UrbanRiskGlobe: React.FC<UrbanRiskGlobeProps> = ({
  onSelectZone,
  style,
  className,
}) => {
  const [selectedZone, setSelectedZone] = useState<GlobeZone>(DEMO_GLOBE_ZONES[0]!);
  const [filter, setFilter] = useState<'all' | 'critical' | 'flood' | 'predictive'>('all');

  const filteredZones = useMemo(() => {
    if (filter === 'all') return DEMO_GLOBE_ZONES;
    return DEMO_GLOBE_ZONES.filter((z) => z.category === filter);
  }, [filter]);

  const handleSelect = (zone: GlobeZone) => {
    setSelectedZone(zone);
    onSelectZone?.(zone);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, rgba(10, 132, 255, 0.08) 0%, transparent 75%)',
        ...style,
      }}
      className={className}
    >
      <Canvas camera={{ position: [0, 2, 13], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} color="#FFFFFF" />
        <pointLight position={[-10, -5, -10]} intensity={1.2} color="#0A84FF" />

        <HolographicSphere />
        <AtmosphericGlow />

        {/* Zones */}
        {filteredZones.map((z) => (
          <ZonePin
            key={z.id}
            zone={z}
            isSelected={selectedZone.id === z.id}
            onSelect={() => handleSelect(z)}
          />
        ))}

        {/* Connecting Data Arcs */}
        {filteredZones.length > 1 && (
          <>
            <ConnectingArc start={filteredZones[0]!} end={filteredZones[1]!} />
            {filteredZones[2] && <ConnectingArc start={filteredZones[1]!} end={filteredZones[2]!} />}
          </>
        )}

        <OrbitControls
          enableZoom={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          minDistance={8}
          maxDistance={25}
        />
      </Canvas>

      {/* Floating Liquid Glass Control Bar */}
      <div
        className="position-absolute top-0 start-0 m-3 d-flex align-items-center gap-2"
        style={{ zIndex: 10 }}
      >
        <div
          className="glass-panel py-1 px-3 d-flex align-items-center gap-2"
          style={{ borderRadius: '12px', fontSize: '0.8rem' }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64D2FF' }} />
          <span className="fw-bold">SPATIAL RISK GLOBE</span>
          <span className="text-secondary">|</span>
          <div className="btn-group btn-group-sm" role="group">
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm py-0 px-2 ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              All Zones
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`btn btn-sm py-0 px-2 ${filter === 'critical' ? 'btn-danger' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              Critical
            </button>
            <button
              onClick={() => setFilter('flood')}
              className={`btn btn-sm py-0 px-2 ${filter === 'flood' ? 'btn-info text-white' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              Flood Runoff
            </button>
            <button
              onClick={() => setFilter('predictive')}
              className={`btn btn-sm py-0 px-2 ${filter === 'predictive' ? 'btn-warning' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              AI Predictions
            </button>
          </div>
        </div>
      </div>

      {/* Selected Zone Spatial Telemetry Card */}
      {selectedZone && (
        <div
          className="position-absolute bottom-0 end-0 m-3 glass-panel p-3"
          style={{
            width: '320px',
            borderRadius: '16px',
            zIndex: 10,
            boxShadow: 'var(--cp-shadow-lg)',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small text-secondary font-monospace">GEO-INTELLIGENCE PIN</span>
            <span
              className="badge"
              style={{
                backgroundColor:
                  selectedZone.riskScore > 80
                    ? 'rgba(255, 69, 58, 0.2)'
                    : 'rgba(255, 159, 10, 0.2)',
                color: selectedZone.riskScore > 80 ? '#FF453A' : '#FF9F0A',
                border: '1px solid rgba(255, 69, 58, 0.3)',
              }}
            >
              RISK {selectedZone.riskScore}/100
            </span>
          </div>
          <h6 className="fw-bold mb-1">{selectedZone.name}</h6>
          <p className="small text-secondary mb-2" style={{ fontSize: '0.8rem' }}>
            {selectedZone.predictionSnippet}
          </p>
          <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small">
            <span className="text-secondary">Active Clusters:</span>
            <span className="fw-bold text-primary">{selectedZone.activeIncidents} Incidents</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrbanRiskGlobe;
