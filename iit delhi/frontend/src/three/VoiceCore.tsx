import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { voiceFragmentShader, voiceVertexShader } from "./shaders/voiceShaders";
import { useVoiceStore } from "../features/voice/VoiceContext";
import { audioAnalyzer } from "../features/voice/audioAnalyzer";
import { threeConfig } from "./threeConfig";
import { useAppReducedMotion } from "../motion/reducedMotion";

export function VoiceCore({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const voiceState = useVoiceStore(state => state.state);
  const isReducedMotion = useAppReducedMotion();

  // Map state to an integer for the shader
  const stateInt = useMemo(() => {
    switch (voiceState) {
      case "listening":
        return 1;
      case "processing":
      case "thinking":
        return 2;
      case "speaking":
        return 3;
      case "success":
        return 4;
      case "error":
        return 5;
      default:
        return 0;
    }
  }, [voiceState]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: 0 },
      uState: { value: stateInt },
      uColorMain: { value: new THREE.Color(threeConfig.colors.trustCore) },
      uColorGlow: { value: new THREE.Color(threeConfig.colors.signal) },
      uColorSuccess: { value: new THREE.Color(threeConfig.colors.success) },
      uColorError: { value: new THREE.Color(threeConfig.colors.attention) },
    }),
    []
  );

  useFrame(state => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uState.value = stateInt;

      // If reduced motion is on, clamp amplitude
      materialRef.current.uniforms.uAmplitude.value = isReducedMotion
        ? 0.1
        : audioAnalyzer.getAmplitude();
    }

    // Slight idle rotation
    if (meshRef.current && !isReducedMotion) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  return (
    <mesh ref={meshRef} position={new THREE.Vector3(...position)}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={voiceVertexShader}
        fragmentShader={voiceFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
