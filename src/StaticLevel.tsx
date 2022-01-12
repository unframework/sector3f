import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { Op, Shape } from './csg';
import { LevelMesh } from './levelMesh';

export const Corridor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <group>
      <Shape type="cuboid" center={[0, 0, 0.5]} size={[1, 5, 1]} />

      <mesh
        position={[0, 0, 1.05]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[0.25, 0.25]} />
        <meshStandardMaterial
          color="#202020"
          emissive={new THREE.Color(color || '#ffffa0')}
          emissiveIntensity={2}
        />

        <Shape type="cuboid" center={[0, 0, 0]} size={[0.25, 0.25, 0.1]} />
      </mesh>
    </group>
  );
};

export const StaticLevel: React.FC = () => {
  return (
    <>
      <LevelMesh>
        <Op type="union">
          <Shape type="cuboid" center={[-1.5, 0.5, 0.5]} size={[3, 1, 1.5]} />
          <group position={[0.5, 0.5, 0]}>
            <Corridor />
          </group>
          <group position={[0.5, 4.5, 0]}>
            <Corridor />
          </group>
          <group position={[4.5, 0.5, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[4.5, 4.5, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[2.5, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor />
          </group>
          <group position={[2.5, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#c08000" />
          </group>
          <group position={[2.5, 6.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#000000" />
          </group>
        </Op>
      </LevelMesh>

      <pointLight color="#f0f0ff" position={[3.25, 6.25, 0.125]} castShadow />

      <ambientLight color="#202020" />
    </>
  );
};
