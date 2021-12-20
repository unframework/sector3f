import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

export const MainStage: React.FC = () => {
  const cameraRef = useRef<THREE.Object3D>();
  const orbitRef = useRef<OrbitControlsImpl>(null);

  useFrame(({ clock }) => {
    const camera = cameraRef.current;
    const orbit = orbitRef.current;
    if (!camera || !orbit) {
      return;
    }
  });

  return (
    <group>
      <PerspectiveCamera
        position={[0, -1, 2]}
        up={[0, 0, 1]}
        near={0.1}
        far={500}
        fov={45}
        makeDefault
        ref={cameraRef}
      />
      <OrbitControls target={[0, 0, 0]} ref={orbitRef} />

      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#ff4060" roughness={0.2} />
      </mesh>

      <pointLight position={[-2, 2, 4]} />
      <ambientLight color="#202020" />
    </group>
  );
};
