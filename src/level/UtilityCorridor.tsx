import React from 'react';
import * as THREE from 'three';
import { LightmapReadOnly } from '@react-three/lightmap';

import { CSGContent } from '../csg';
import { WorldUV } from '../levelMesh';

export const UtilityCorridor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <group>
      <CSGContent
        material={[
          'blockWall',
          'blockWall',
          'blockWall',
          'blockWall',
          'roofSlat',
          'rawConcrete'
        ]}
      >
        <mesh position={[0, 0, 1.5]}>
          <boxBufferGeometry args={[2, 4, 3]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <LightmapReadOnly>
        <mesh
          position={[0, 0, 2.249]}
          rotation={new THREE.Euler(Math.PI, 0, 0)}
          receiveShadow
        >
          <planeBufferGeometry args={[0.25, 0.5]} />
          <meshStandardMaterial
            color="#202020"
            emissive={new THREE.Color(color || '#ffffe0')}
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, 0, 2.275]} receiveShadow>
          <boxBufferGeometry args={[0.35, 0.6, 0.05]} />
          <meshStandardMaterial color="#808080" />

          {/* support stem going up */}
          <mesh
            position={[0, 0, 0.5]}
            rotation={new THREE.Euler(Math.PI, 0, 0)}
            receiveShadow
          >
            <boxBufferGeometry args={[0.05, 0.05, 1]} />
            <meshStandardMaterial color="#808080" />
          </mesh>
        </mesh>
      </LightmapReadOnly>
    </group>
  );
};
