import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

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

  const [prepForTeleport, setPrepForTeleport] = useState(false);
  const [activeTeleport, setActiveTeleport] = useState(false);

  return (
    <group>
      <TopDownPhysics>
        {activeTeleport ? null : (
          <FPSCamera position={[1, -8, 1.25]} look={cameraLook}>
            <FPSBody radius={0.3} movement={wasdMovement} look={cameraLook} />
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
            onComplete={() => {
              console.log('ready for teleport');
              setPrepForTeleport(true);
            }}
          />
        </React.Suspense>
      </TopDownPhysics>

      {prepForTeleport && (
        <group position={[6, 2, 0]}>
          <TopDownPhysics>
            {activeTeleport ? (
              <FPSCamera position={[0, 0, 1.25]} look={cameraLook}>
                <FPSBody
                  radius={0.3}
                  movement={wasdMovement}
                  look={cameraLook}
                />
              </FPSCamera>
            ) : null}

            <React.Suspense
              fallback={
                <CompletionTracker
                  onComplete={() => {
                    console.log('target level ready');
                    setActiveTeleport(true);
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
