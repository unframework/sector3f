import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import { useWASD, useCameraLook } from './wasd';
import { TopDownPhysics, Body, FPSBody } from './physics';
import { StaticLevel } from './StaticLevel';

export const MainStage: React.FC = () => {
  const cameraRef = useRef<THREE.Camera | null>(null);
  const cameraLook = useCameraLook(({ yaw, pitch }) => {
    if (!cameraRef.current) {
      return;
    }

    cameraRef.current.quaternion.setFromEuler(
      new THREE.Euler(pitch, 0, yaw, 'ZXY')
    );
  });
  const wasdMovement = useWASD();

  return (
    <TopDownPhysics>
      <group>
        <group position={[0.5, -0.5, 0.5]}>
          <PerspectiveCamera
            near={0.075}
            far={100}
            fov={80}
            makeDefault
            ref={cameraRef}
          />
          <FPSBody radius={0.15} movement={wasdMovement} look={cameraLook} />
        </group>

        <React.Suspense
          fallback={
            <>
              <pointLight position={[0, 0, 6]} color="#f0f0ff" castShadow />

              <mesh position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[15, 15]} />
                <meshStandardMaterial color="#808080" roughness={0.6} />
              </mesh>
            </>
          }
        >
          <StaticLevel />
        </React.Suspense>

        {/*<mesh position={[0, 2, 0.25]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#c8c880" roughness={0.9} />
          <Body />
        </mesh>*/}
        {/*<mesh position={[1, 2, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#80c880" roughness={0.9} />
          <Body />
        </mesh>*/}
      </group>
    </TopDownPhysics>
  );
};
