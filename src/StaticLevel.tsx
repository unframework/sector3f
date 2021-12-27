import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';

import { Body } from './physics';
import { CSGModel, Op, Shape } from './csg';

export const StaticLevel: React.FC = () => {
  return (
    <Lightmap>
      <CSGModel>
        <Op type="union">
          <Op type="subtract">
            <Shape type="cuboid" center={[0, 0, 1]} size={[6, 6, 2]} />
            <Shape type="cuboid" center={[-2, -2, 1]} size={[1, 1, 2]} />
          </Op>
          <group position={[-1, 4, 0]}>
            <Shape type="cuboid" center={[0, 0, 0.5]} size={[1, 2, 1]} />

            <mesh
              position={[0, 0.5, 0.975]}
              rotation={new THREE.Euler(Math.PI, 0, 0)}
              receiveShadow
            >
              <planeGeometry args={[0.5, 0.5]} />
              <meshStandardMaterial
                color="#202020"
                emissive={new THREE.Color('#ffffa0')}
                emissiveIntensity={1}
              />
            </mesh>
          </group>
        </Op>
      </CSGModel>

      <pointLight
        position={[-2.5, 2.5, 1.8]}
        intensity={0.5}
        color="#f0f0ff"
        castShadow
      />
      <pointLight
        position={[2.5, 2.5, 1.8]}
        intensity={0.5}
        color="#fffff0"
        castShadow
      />
      <ambientLight color="#202020" />
    </Lightmap>
  );
};
