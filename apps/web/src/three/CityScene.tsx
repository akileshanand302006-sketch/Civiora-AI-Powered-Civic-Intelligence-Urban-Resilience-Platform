// ============================================================
// CivicPulse 3D Digital Twin City Scene (Three.js + React Three Fiber)
// Ultra-Premium Liquid Glass & Spatial Computing Edition
// ============================================================

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

export type RoleTheme =
  | 'citizen'
  | 'field_worker'
  | 'department_officer'
  | 'department_manager'
  | 'emergency_operator'
  | 'moderator'
  | 'tenant_admin'
  | 'system_admin'
  | 'security_auditor';

export interface IncidentNode {
  id: string;
  type: 'pothole' | 'flood' | 'emergency' | 'resolved' | 'prediction';
  position: [number, number, number];
  title: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
}

// ── Default Incident Nodes ──────────────────────────────────
export const DEFAULT_INCIDENT_NODES: IncidentNode[] = [
  {
    id: 'inc-pothole-1',
    type: 'pothole',
    position: [6, 0, -5],
    title: 'Pothole Cluster: 4th Cross Asphalt Breach',
    severity: 'medium',
  },
  {
    id: 'inc-flood-1',
    type: 'flood',
    position: [-7, 0, -4],
    title: 'Monsoon Overflow: Sector 7 Storm Drain',
    severity: 'high',
  },
  {
    id: 'inc-emergency-1',
    type: 'emergency',
    position: [-2, 0, 7],
    title: 'Emergency: High-Voltage Transformer Arc',
    severity: 'critical',
  },
  {
    id: 'inc-resolved-1',
    type: 'resolved',
    position: [8, 0, 6],
    title: 'Repaired Traffic Signal & Pedestrian Crossing',
    severity: 'low',
  },
  {
    id: 'inc-prediction-1',
    type: 'prediction',
    position: [-8, 0, 3],
    title: 'AI Prediction: High Stress Water Main Risk Zone',
    confidence: 0.94,
    severity: 'high',
  },
];

// ── Procedural Buildings with Emissive Glass Windows ────────
function ProceduralCityBuildings({ role }: { role?: RoleTheme }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];

    // Role-dependent lighting palettes calibrated to Civiora Dark Navy & Ice-Blue
    let baseColor = new THREE.Color('#527FC7');
    let accentColor = new THREE.Color('#9FC9FF');
    const darkBuilding = new THREE.Color('#0C1930');

    if (role === 'emergency_operator') {
      baseColor = new THREE.Color('#FF453A');
      accentColor = new THREE.Color('#FF9F0A');
    } else if (role === 'security_auditor') {
      baseColor = new THREE.Color('#BF5AF2');
      accentColor = new THREE.Color('#9FC9FF');
    } else if (role === 'field_worker') {
      baseColor = new THREE.Color('#FF9F0A');
      accentColor = new THREE.Color('#FFD60A');
    }

    const gridSize = 12;
    const spacing = 2.4;

    for (let x = -gridSize; x <= gridSize; x += 2) {
      for (let z = -gridSize; z <= gridSize; z += 2) {
        // Leave broad arterial avenues & central plaza open
        if (Math.abs(x) <= 2 && Math.abs(z) <= 2) continue;
        if (Math.abs(x) === 6 || Math.abs(z) === 6) continue;

        const height = Math.random() * 5 + 1.2;
        dummy.position.set(
          x * spacing + (Math.random() * 0.4 - 0.2),
          height / 2,
          z * spacing + (Math.random() * 0.4 - 0.2)
        );
        dummy.scale.set(1.4 + Math.random() * 0.6, height, 1.4 + Math.random() * 0.6);
        dummy.updateMatrix();

        mats.push(dummy.matrix.clone());

        const roll = Math.random();
        if (roll > 0.82) {
          cols.push(accentColor.clone());
        } else if (roll > 0.45) {
          cols.push(baseColor.clone());
        } else {
          cols.push(darkBuilding.clone());
        }
      }
    }

    return { matrices: mats, colors: cols };
  }, [role]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.015;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, matrices.length]}
      onUpdate={(self) => {
        matrices.forEach((mat, i) => self.setMatrixAt(i, mat));
        colors.forEach((col, i) => self.setColorAt(i, col));
        self.instanceMatrix.needsUpdate = true;
        if (self.instanceColor) self.instanceColor.needsUpdate = true;
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.15}
        metalness={0.85}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  );
}

// ── Holographic Ground Grid & Radial Radar Rings ────────────
function HolographicGrid({ role }: { role?: RoleTheme }) {
  const gridColor =
    role === 'emergency_operator'
      ? '#FF453A'
      : role === 'security_auditor'
      ? '#BF5AF2'
      : '#527FC7';

  return (
    <group position={[0, -0.05, 0]}>
      <gridHelper args={[80, 40, gridColor, '#0C1930']} />
      {/* Concentric city radar rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[12, 12.15, 64]} />
        <meshBasicMaterial color={gridColor} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[24, 24.2, 64]} />
        <meshBasicMaterial color={gridColor} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Distinct Incident Visualizers (Section 6 Requirement) ───
// 1. Pothole: Small localized pulse
function PotholePulse({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      const s = 1 + (Math.sin(state.clock.getElapsedTime() * 4) + 1) * 0.4;
      ringRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 12]} />
        <meshBasicMaterial color="#FF9F0A" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#FF9F0A" emissive="#FF9F0A" emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshBasicMaterial color="#FF9F0A" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 2. Flood: Expanding translucent blue zone
function FloodZone({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  const zoneRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (zoneRef.current) {
      const t = state.clock.getElapsedTime();
      const scale = 2.5 + Math.sin(t * 1.5) * 0.5;
      zoneRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5, 12]} />
        <meshBasicMaterial color="#64D2FF" transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#64D2FF" emissive="#0A84FF" emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={zoneRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#0A84FF" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 3. Emergency: Controlled red/orange pulse beacon
function EmergencyBeacon({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  const beaconRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beaconRef.current) {
      beaconRef.current.position.y = position[1] + Math.sin(t * 5) * 0.25;
    }
    if (ringRef.current) {
      const ringScale = 1 + (t * 2 % 3);
      ringRef.current.scale.set(ringScale, ringScale, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, 0.8 - (ringScale / 4));
    }
  });

  return (
    <group ref={beaconRef} position={position} onClick={onClick}>
      {/* Red Light Pillar */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 7, 16]} />
        <meshBasicMaterial color="#FF453A" transparent opacity={0.8} />
      </mesh>
      <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
        <mesh position={[0, 7.2, 0]}>
          <octahedronGeometry args={[0.55]} />
          <meshStandardMaterial
            color="#FF453A"
            emissive="#FF453A"
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      </Float>
      {/* Shockwave alert ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial color="#FF453A" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 4. Resolved: Soft green fading ring
function ResolvedMarker({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  const markerRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.rotation.y = state.clock.getElapsedTime() * 0.8;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.6, 12]} />
        <meshBasicMaterial color="#30D158" transparent opacity={0.5} />
      </mesh>
      <mesh ref={markerRef} position={[0, 3.8, 0]}>
        <torusGeometry args={[0.35, 0.08, 12, 24]} />
        <meshStandardMaterial color="#30D158" emissive="#30D158" emissiveIntensity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.6, 0.9, 32]} />
        <meshBasicMaterial color="#30D158" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 5. AI Prediction: Violet/Cyan projected risk region
function AIPredictionZone({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 6, 12]} />
        <meshBasicMaterial color="#BF5AF2" transparent opacity={0.6} />
      </mesh>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[0, 6.2, 0]}>
          <dodecahedronGeometry args={[0.45]} />
          <meshStandardMaterial color="#BF5AF2" emissive="#64D2FF" emissiveIntensity={0.7} />
        </mesh>
      </Float>
      {/* Projected polygon risk area */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[1.2, 2.4, 6]} />
        <meshBasicMaterial color="#BF5AF2" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Particle Data Streams ───────────────────────────────────
function CityDataStreams() {
  const count = 380;
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 55;
      pos[i * 3 + 1] = Math.random() * 10 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }
    return [pos];
  }, []);

  useFrame(() => {
    if (pointsRef.current?.geometry?.attributes?.position) {
      const positionsAttr = pointsRef.current.geometry.attributes.position;
      const arr = positionsAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const yIndex = i * 3 + 1;
        const currentY = arr[yIndex];
        if (currentY !== undefined) {
          arr[yIndex] = currentY > 12 ? 0.2 : currentY + 0.02;
        }
      }
      positionsAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        color="#64D2FF"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Camera Controller for Role Presets ──────────────────────
function CameraRig({ role }: { role?: RoleTheme }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!role) return;

    // Smoothly shift camera position based on role
    let target = new THREE.Vector3(22, 18, 26);
    if (role === 'emergency_operator') {
      target = new THREE.Vector3(12, 14, 18);
    } else if (role === 'field_worker') {
      target = new THREE.Vector3(16, 10, 20);
    } else if (role === 'security_auditor') {
      target = new THREE.Vector3(25, 22, 28);
    }

    camera.position.lerp(target, 0.8);
  }, [role, camera]);

  return null;
}

// ── Main Scene Canvas Component ─────────────────────────────
export interface CitySceneProps {
  onSelectIncident?: (incidentId: string) => void;
  interactive?: boolean;
  role?: RoleTheme;
  nodes?: IncidentNode[];
  style?: React.CSSProperties;
  className?: string;
}

export const CityScene: React.FC<CitySceneProps> = ({
  onSelectIncident,
  interactive = true,
  role = 'citizen',
  nodes = DEFAULT_INCIDENT_NODES,
  style,
  className,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      <Canvas
        camera={{ position: [20, 18, 25], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraRig role={role} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 22, 15]} intensity={1.4} color="#FFFFFF" />

        {/* Dynamic ambient role color lighting */}
        <pointLight
          position={[-15, 12, -10]}
          intensity={2.8}
          color={
            role === 'emergency_operator'
              ? '#FF453A'
              : role === 'field_worker'
              ? '#FF9F0A'
              : '#527FC7'
          }
        />
        <pointLight position={[15, 10, 15]} intensity={2.2} color="#9FC9FF" />

        <ProceduralCityBuildings role={role} />
        <HolographicGrid role={role} />
        <CityDataStreams />

        {/* Render polymorphic spatial incident nodes */}
        {nodes.map((node) => {
          const handleClick = () => onSelectIncident?.(node.id);
          switch (node.type) {
            case 'pothole':
              return <PotholePulse key={node.id} position={node.position} onClick={handleClick} />;
            case 'flood':
              return <FloodZone key={node.id} position={node.position} onClick={handleClick} />;
            case 'emergency':
              return <EmergencyBeacon key={node.id} position={node.position} onClick={handleClick} />;
            case 'resolved':
              return <ResolvedMarker key={node.id} position={node.position} onClick={handleClick} />;
            case 'prediction':
              return <AIPredictionZone key={node.id} position={node.position} onClick={handleClick} />;
            default:
              return <PotholePulse key={node.id} position={node.position} onClick={handleClick} />;
          }
        })}

        {interactive && (
          <OrbitControls
            enableZoom={true}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={8}
            maxDistance={55}
            autoRotate={false}
          />
        )}
      </Canvas>
    </div>
  );
};

export default CityScene;
