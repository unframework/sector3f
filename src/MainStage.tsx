import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { useWASD, useCameraLook } from './wasd';
import { TopDownPhysics, Body, FPSBody } from './physics';
import { StaticLevel } from './StaticLevel';
import { TargetLevel } from './TargetLevel';

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

const CompletionTracker: React.FC<{ onComplete: () => void }> = ({
  onComplete
}) => {
  // keep latest reference
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    return () => {
      onCompleteRef.current();
    };
  }, []);

  return null;
};

export const MainStage: React.FC = () => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  const fpsBodyRef = useRef<b2.Body>();

  // when level is complete, store the teleport room (elevator) center as reference
  const [teleportRequestOrigin, setTeleportRequestOrigin] = useState<
    [number, number] | null
  >(null);

  // set when new level is baked and ready
  const [targetIsReady, setTargetIsReady] = useState(false);

  return (
    <group>
      <ambientLight color="#202020" />

      <TopDownPhysics>
        {teleportRequestOrigin && targetIsReady ? null : (
          <FPSCamera position={[1, -12, 1.25]} look={cameraLook}>
            <FPSBody
              radius={0.3}
              movement={wasdMovement}
              look={cameraLook}
              bodyRef={fpsBodyRef}
            />
          </FPSCamera>
        )}

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
          <StaticLevel
            onComplete={teleportOrigin => {
              console.log('ready for teleport from', teleportOrigin);
              setTeleportRequestOrigin(teleportOrigin);
            }}
          />
        </React.Suspense>
      </TopDownPhysics>

      {teleportRequestOrigin && (
        <group position={[9, 0, 0]}>
          <TopDownPhysics>
            {teleportRequestOrigin && targetIsReady ? (
              <FPSCamera position={[0, -12, 1.25]} look={cameraLook}>
                <FPSBody
                  radius={0.3}
                  movement={wasdMovement}
                  look={cameraLook}
                  // also seamlessly transfer relative position, etc
                  cloneBody={fpsBodyRef.current}
                  cloneOrigin={teleportRequestOrigin}
                />
              </FPSCamera>
            ) : null}

            <React.Suspense
              fallback={
                <CompletionTracker
                  onComplete={() => {
                    console.log('target level ready');
                    setTimeout(() => setTargetIsReady(true), 1000);
                  }}
                />
              }
            >
              <TargetLevel />
            </React.Suspense>
          </TopDownPhysics>
        </group>
      )}
    </group>
  );
};
