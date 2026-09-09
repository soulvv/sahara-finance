import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { threeConfig } from "./threeConfig";
import { useAppReducedMotion } from "../motion/reducedMotion";

// Pre-compute stable particle positions so they don't flicker on re-render
function generateParticlePositions(count: number, radius: number) {
  const positions: [number, number, number][] = [];
  // Use golden spiral for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    positions.push([
      Math.cos(theta) * radiusAtY * radius,
      y * radius,
      Math.sin(theta) * radiusAtY * radius,
    ]);
  }
  return positions;
}

// Generate connection lines between nearby particles
function generateConnectionPairs(
  positions: [number, number, number][],
  maxDist: number
) {
  const pairs: [number, number][] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i][0] - positions[j][0];
      const dy = positions[i][1] - positions[j][1];
      const dz = positions[i][2] - positions[j][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < maxDist) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

export function TrustSphere({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group>(null);
  const isReducedMotion = useAppReducedMotion();

  const particleCount = isReducedMotion ? 12 : 24;
  const particles = useMemo(
    () => generateParticlePositions(particleCount, 1.5),
    [particleCount]
  );
  const connections = useMemo(
    () => generateConnectionPairs(particles, 0.9),
    [particles]
  );

  // Geometry for connection lines
  const lineGeometries = useMemo(() => {
    return connections.map(([a, b]) => {
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        particles[a][0],
        particles[a][1],
        particles[a][2],
        particles[b][0],
        particles[b][1],
        particles[b][2],
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      return geo;
    });
  }, [connections, particles]);

  useFrame(state => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (!isReducedMotion) {
      groupRef.current.rotation.y = t * 0.08;
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.08;
    }

    // Animate individual particles along their orbital paths
    if (particlesRef.current && !isReducedMotion) {
      particlesRef.current.children.forEach((child, i) => {
        const basePos = particles[i];
        const offset = Math.sin(t * 0.5 + i * 0.7) * 0.06;
        child.position.set(
          basePos[0] + offset,
          basePos[1] + Math.sin(t * 0.3 + i) * 0.04,
          basePos[2] + Math.cos(t * 0.4 + i * 0.5) * 0.05
        );
        // Pulse scale
        const scale = 0.8 + Math.sin(t * 2 + i * 1.2) * 0.3;
        child.scale.setScalar(scale);
      });
    }

    // Fade connection lines based on time
    if (linesRef.current && !isReducedMotion) {
      linesRef.current.children.forEach((child, i) => {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
        mat.opacity = 0.15 + Math.sin(t * 0.8 + i * 0.5) * 0.1;
      });
    }
  });

  return (
    <group ref={groupRef} position={new THREE.Vector3(...position)}>
      {/* Outer translucent sphere — frosted glass effect */}
      <mesh>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshPhysicalMaterial
          color={threeConfig.colors.ivory}
          transmission={0.92}
          opacity={1}
          metalness={0.05}
          roughness={0.15}
          ior={1.5}
          thickness={2.5}
          specularIntensity={0.8}
          transparent
        />
      </mesh>

      {/* Inner core — warm, trustworthy */}
      <mesh>
        <sphereGeometry args={[0.65, 48, 48]} />
        <meshStandardMaterial
          color={threeConfig.colors.trustCore}
          emissive={threeConfig.colors.signal}
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Connection lines — data paths (lineSegments avoids the SVG <line> typing clash) */}
      <group ref={linesRef}>
        {lineGeometries.map((geo, i) => (
          <lineSegments key={i} geometry={geo}>
            <lineBasicMaterial
              color={threeConfig.colors.signal}
              transparent
              opacity={0.2}
            />
          </lineSegments>
        ))}
      </group>

      {/* Orbiting particles — financial nodes */}
      <group ref={particlesRef}>
        {particles.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial
              color={
                i % 3 === 0
                  ? threeConfig.colors.signal
                  : threeConfig.colors.success
              }
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
