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
          <Shape
            type="cylinder"
            center={[0, 0, 1]}
            height={1}
            radius={1}
            segments={4}
          />
          <Shape
            type="cylinder"
            center={[0, 0.5, 1.5]}
            height={1}
            radius={1}
            segments={4}
          />
        </Op>
      </CSGModel>

      <mesh position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        {/*<meshStandardMaterial color="#c0c0c8" roughness={0.6} />*/}
        <MeshReflectorMaterial
          color="#c0c0c8"
          blur={[400, 400]}
          mirror={0}
          resolution={1024}
          mixBlur={1}
          mixStrength={0.75}
          depthScale={0.15}
          minDepthThreshold={0.9}
          maxDepthThreshold={1}
          metalness={0}
          roughness={1}
          lightMapIntensity={2}
        />
      </mesh>

      <mesh position={[-2, 0, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#c08088" roughness={0.6} />
        <Body isStatic />
      </mesh>

      <mesh position={[2, 0, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#8080c8" roughness={0.6} />
        <Body isStatic />
      </mesh>

      <mesh position={[-1.5, 0, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial
          color="#000000"
          emissive={new THREE.Color('#ffff00')}
          emissiveIntensity={3}
        />
      </mesh>

      <pointLight
        position={[-12, 12, 4]}
        intensity={0.9}
        color="#f0f0ff"
        castShadow
      />
      <pointLight
        position={[4, -8, 4]}
        intensity={0.6}
        color="#fffff0"
        castShadow
      />
      <ambientLight color="#101010" />
    </Lightmap>
  );
};
