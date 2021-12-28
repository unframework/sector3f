import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';

import { Body } from './physics';
import { CSGModel, Op, Shape } from './csg';

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
    <Lightmap>
      <CSGModel>
        <Op type="union">
          <group position={[0.5, 0.5, 0]}>
            <Corridor />
          </group>
          <group position={[0.5, 4.5, 0]}>
            <Corridor />
          </group>
          <group position={[2.5, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#c08000" />
          </group>
        </Op>
      </CSGModel>

      <ambientLight color="#202020" />
    </Lightmap>
  );
};
