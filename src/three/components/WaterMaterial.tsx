import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float ripple = sin((vUv.x * 9.0 + vUv.y * 9.0) + uTime * 1.1) * 0.5 + 0.5;
    vec3 color = uColor + ripple * 0.05;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

interface WaterMaterialProps {
  color: string;
  opacity?: number;
}

/**
 * A lightweight animated water look (a UV/time-based ripple in a small
 * custom shader) rather than a full water-shader library — cheap enough to
 * share across the ocean, river ribbons, and lake surfaces.
 */
export function WaterMaterial({ color, opacity = 0.82 }: WaterMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    [color, opacity]
  );

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      uniforms={uniforms}
      vertexShader={VERTEX_SHADER}
      fragmentShader={FRAGMENT_SHADER}
      transparent
      depthWrite={false}
    />
  );
}
