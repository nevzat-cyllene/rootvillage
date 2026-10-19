"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function AtlasEnvironment({
  shadowMapSize = 2048,
}: {
  shadowMapSize?: number;
}) {
  const skyMat = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#F7F8FA");
    g.addColorStop(0.45, "#E8ECF1");
    g.addColorStop(1, "#C5CBD3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false });
  }, []);

  return (
    <>
      <mesh scale={[90, 90, 90]}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={skyMat} attach="material" />
      </mesh>

      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#F5F6F8", "#9AA3AE", 0.65]} />
      <directionalLight
        castShadow
        position={[14, 22, 10]}
        intensity={1.35}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-10, 8, -6]} intensity={0.28} color="#D2D6DC" />

      {/* Terrain disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[56, 96]} />
        <meshStandardMaterial color="#E4E8ED" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[22, 52, 96]} />
        <meshStandardMaterial color="#D5DAE1" roughness={1} transparent opacity={0.85} />
      </mesh>

      {/* Soft distant hills */}
      <mesh position={[-18, 0.8, -22]} rotation={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#C9CFD7" roughness={1} />
      </mesh>
      <mesh position={[20, 0.6, -18]} rotation={[0, -0.3, 0]}>
        <sphereGeometry args={[5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D0D5DC" roughness={1} />
      </mesh>
      <mesh position={[4, 0.4, -28]}>
        <sphereGeometry args={[8, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#BEC5CE" roughness={1} />
      </mesh>
    </>
  );
}
