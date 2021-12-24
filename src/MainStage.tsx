import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { useWASD } from './wasd';
import { TopDownPhysics, Body } from './physics';

export const MainStage: React.FC = () => {
  const wasdMovement = useWASD();

  return (
    <TopDownPhysics playerMovement={wasdMovement}>
      <group>
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
        </mesh>

        <mesh position={[2, 0, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 2, 1]} />
          <meshStandardMaterial color="#8080c8" roughness={0.6} />
        </mesh>

        <mesh position={[2, 2, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#80c880" roughness={0.9} />

          <Body />
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
      </group>
    </TopDownPhysics>
  );
};
