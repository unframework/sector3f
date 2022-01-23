import React from 'react';
import * as THREE from 'three';

import { CSGContent } from '../csg';
import { LevelMesh, WorldUV } from '../levelMesh';

export const UtilityCorridor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <group>
      <CSGContent
        material={[
          'blockWall',
          'blockWall',
          'blockWall',
          'blockWall',
          'default',
          'rawConcrete'
        ]}
      >
        <mesh position={[0, 0, 1.25]}>
          <boxBufferGeometry args={[2, 10, 2.5]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <mesh
        position={[0, 0, 2.55]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial
          color="#202020"
          emissive={new THREE.Color(color || '#ffffe0')}
          emissiveIntensity={1.2}
        />

        <CSGContent>
          <mesh>
            <boxBufferGeometry args={[0.5, 0.5, 0.1]} />
            <WorldUV />
          </mesh>
        </CSGContent>
      </mesh>
    </group>
  );
};
