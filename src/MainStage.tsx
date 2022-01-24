import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useWASD, useCameraLook } from './wasd';
import { FPSBody } from './physics';
import { LevelSequence } from './LevelSequence';

const FPSCamera: React.FC<{
  position: [number, number, number];
  look: { pitch: number; yaw: number };
}> = ({ position, look, children }) => {
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

  // position must be on the base object itself, not parent, for z-offset to get picked up
  return (
    <group position={position} ref={cameraBaseRef}>
      {children}
    </group>
  );
};

export const MainStage: React.FC = () => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  return (
    <group>
      <ambientLight color="#202020" />

      <LevelSequence
        camera={(bodyRef, cloneBody, cloneOrigin) => (
          <FPSCamera position={[0, 0, 1.75]} look={cameraLook}>
            <FPSBody
              radius={0.3}
              movement={wasdMovement}
              look={cameraLook}
              bodyRef={bodyRef}
              // also seamlessly transfer relative position, etc
              cloneBody={cloneBody}
              cloneOrigin={cloneOrigin}
            />
          </FPSCamera>
        )}
      />
    </group>
  );
};
