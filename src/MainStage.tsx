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
        position={[0, -5, 4]}
        up={[0, 0, 1]}
        near={0.1}
        far={500}
        fov={45}
        makeDefault
        ref={cameraRef}
      />
      <OrbitControls target={[0, 0, 0]} ref={orbitRef} />

      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#c0c0c8" roughness={0.6} />
      </mesh>

      <mesh position={[-2, 0, 0.5]}>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#c08088" roughness={0.6} />
      </mesh>

      <mesh position={[2, 0, 0.5]}>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#8080c8" roughness={0.6} />
      </mesh>

      <pointLight position={[-12, 12, 4]} intensity={0.9} color="#f0f0ff" />
      <pointLight position={[4, -8, 4]} intensity={0.6} color="#fffff0" />
      <ambientLight color="#404040" />
    </group>
  );
};
