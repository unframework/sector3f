import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import { useWASD, useCameraLook } from './wasd';
import { TopDownPhysics, Body, FPSBody } from './physics';
import { StaticLevel } from './StaticLevel';
import { TargetLevel } from './TargetLevel';

const FPSCamera: React.FC<{
  look: { pitch: number; yaw: number };
}> = ({ look, children }) => {
  const cameraBaseRef = useRef<THREE.Object3D | null>(null);

  useFrame(({ camera }) => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    if (!cameraBaseRef.current) {
      return;
    }

    camera.near = 0.075;
    camera.far = 100;
    camera.fov = 80;

    cameraBaseRef.current.updateWorldMatrix(true, false);
    const { yaw, pitch } = look;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, 0, yaw, 'ZXY'));
    camera.position
      .set(0, 0, 0)
      .applyMatrix4(cameraBaseRef.current.matrixWorld);
  }, 0);

  return (
    <group position={[1, -8, 1.25]} ref={cameraBaseRef}>
      {children}
    </group>
  );
};

export const MainStage: React.FC = () => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  return (
    <group>
      <TopDownPhysics>
        <FPSCamera look={cameraLook}>
          <FPSBody radius={0.3} movement={wasdMovement} look={cameraLook} />
        </FPSCamera>

        <React.Suspense
          fallback={
            <>
              <pointLight position={[0, 0, 6]} color="#f0f0ff" castShadow />

              <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[3, 3, 3]} />
                <meshBasicMaterial color="#ff0000" wireframe />
              </mesh>
            </>
          }
        >
          <StaticLevel />
        </React.Suspense>
      </TopDownPhysics>

      <TopDownPhysics>
        <React.Suspense fallback={null}>
          <group position={[8, 0, 0]}>
            <TargetLevel />
          </group>
        </React.Suspense>
      </TopDownPhysics>
    </group>
  );
};
