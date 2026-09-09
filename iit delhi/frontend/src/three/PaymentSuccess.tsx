import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { threeConfig } from "./threeConfig";
import { useAppReducedMotion } from "../motion/reducedMotion";

export function PaymentSuccess({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const isReducedMotion = useAppReducedMotion();

  // Custom geometry for a checkmark
  const checkmarkGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0);
    shape.lineTo(-0.2, -0.3);
    shape.lineTo(0.5, 0.5);
    shape.lineTo(0.4, 0.6);
    shape.lineTo(-0.2, -0.1);
    shape.lineTo(-0.4, 0.1);
    shape.lineTo(-0.5, 0);

    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame(state => {
    if (!isReducedMotion) {
      if (groupRef.current) {
        // Pop-in animation
        const scale = Math.min(1, state.clock.elapsedTime * 2);
        groupRef.current.scale.set(scale, scale, scale);

        // Slight rotation for elegance
        groupRef.current.rotation.y =
          Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      }
      if (ringRef.current) {
        ringRef.current.rotation.z -= 0.02;
      }
    }
  });

  return (
    <group ref={groupRef} position={new THREE.Vector3(...position)}>
      {/* Background glowing ring */}
      <mesh ref={ringRef} position={[0, 0, -0.1]}>
        <torusGeometry args={[1, 0.05, 16, 64]} />
        <meshStandardMaterial
          color={threeConfig.colors.success}
          emissive={threeConfig.colors.success}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* The checkmark */}
      <mesh geometry={checkmarkGeometry} position={[0, -0.1, 0]}>
        <meshStandardMaterial
          color={threeConfig.colors.ivory}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Particle burst — deterministic placement (stable across re-renders) */}
      {!isReducedMotion && (
        <group>
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * 1.5;
            const y = Math.sin(angle) * 1.5;
            const z = Math.sin(i * 2.4) * 0.25; // stable pseudo-depth per index
            return (
              <mesh key={i} position={[x, y, z]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color={threeConfig.colors.success} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}
