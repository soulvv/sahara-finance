import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { threeConfig } from "./threeConfig";
import { useAppReducedMotion } from "../motion/reducedMotion";

export function SecureVault({
  position = [0, 0, 0],
  isOpen = false,
}: {
  position?: [number, number, number];
  isOpen?: boolean;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const isReducedMotion = useAppReducedMotion();

  useFrame(state => {
    if (doorRef.current && !isReducedMotion) {
      // Smoothly open or close the vault door based on isOpen state
      const targetRotationY = isOpen ? -Math.PI / 2.5 : 0;
      doorRef.current.rotation.y +=
        (targetRotationY - doorRef.current.rotation.y) * 0.1;

      // Idle float
      doorRef.current.parent!.position.y =
        Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <group position={new THREE.Vector3(...position)}>
      {/* Vault Body */}
      <mesh position={[0, 0, -0.5]}>
        <boxGeometry args={[2, 2, 1]} />
        <meshStandardMaterial
          color={threeConfig.colors.trustCore}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Vault Door Group (hinged at the left edge) */}
      <group ref={doorRef} position={[-1, 0, 0]}>
        <mesh position={[1, 0, 0]}>
          <boxGeometry args={[2, 2, 0.1]} />
          <meshStandardMaterial
            color={threeConfig.colors.trustCore}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Locking mechanism visualization */}
        <mesh position={[1, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
          <meshStandardMaterial
            color={
              isOpen ? threeConfig.colors.success : threeConfig.colors.signal
            }
            emissive={
              isOpen ? threeConfig.colors.success : threeConfig.colors.signal
            }
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
