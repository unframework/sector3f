import React, { useLayoutEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { useWASD, useCameraLook } from './wasd';
import { TopDownPhysics, Body, FPSBody } from './physics';
import { IntroLevel } from './IntroLevel';
import { SimpleLevel } from './SimpleLevel';
import { DemoEndLevel } from './DemoEndLevel';

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

type LevelCompletionCallback = (teleportOrigin: [number, number]) => void;
type LevelRenderer = (
  onComplete: LevelCompletionCallback
) => React.ReactElement;

export const MainStage: React.FC = () => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  const fpsBodyRef = useRef<b2.Body>();

  const [levelStack] = useState<LevelRenderer[]>(() => [
    onComplete => <IntroLevel onComplete={onComplete} />,
    onComplete => <SimpleLevel onComplete={onComplete} />,
    onComplete => <DemoEndLevel />
  ]);

  // which level to show FPS camera in?
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);

  // track exit points for completed levels (player is in exit elevator)
  const [levelExitPoints, setLevelExitPoints] = useState<
    Record<string, [number, number] | undefined>
  >(() => ({}));

  // active level's FPS body for teleporting
  const exitingFpsBodyRef = useRef<b2.Body>();

  return (
    <group>
      <ambientLight color="#202020" />

      {levelStack.map((level, levelIndex) => {
        // discard past level instances
        if (levelIndex < activeLevelIndex - 1) {
          return null;
        }

        // do not start rendering/baking/etc until previous exit point is established
        const prevExitPoint = levelExitPoints[levelIndex - 1];
        if (levelIndex > 0 && !prevExitPoint) {
          return null;
        }

        // space out the level instances on X axis
        const levelOffsetX = levelIndex * 8;

        const completionCb: LevelCompletionCallback = localTeleportOrigin => {
          console.log('level', levelIndex, 'complete');

          // adjust coordinates
          const worldTeleportOrigin = [
            localTeleportOrigin[0] + levelOffsetX,
            localTeleportOrigin[1]
          ];

          // stash the exit teleport origin
          setLevelExitPoints(prev => ({
            ...prev,

            [levelIndex]: worldTeleportOrigin
          }));

          // stash reference to active FPS body
          exitingFpsBodyRef.current = fpsBodyRef.current;
        };

        const loadedCb = () => {
          console.log('level', levelIndex, 'ready');
          setTimeout(
            () => setActiveLevelIndex(prev => Math.max(prev, levelIndex)),
            200
          );
        };

        // render actual level contents
        const levelContents = levelStack[levelIndex](completionCb);

        // position, suspense, physics wrapper with FPS body controller
        return (
          <group key={levelIndex} position={[levelOffsetX, 0, 0]}>
            <React.Suspense
              fallback={
                levelIndex === 0 ? null : (
                  <CompletionTracker onComplete={loadedCb} />
                )
              }
            >
              <TopDownPhysics>
                {levelContents}

                {levelIndex === activeLevelIndex ? (
                  <FPSCamera position={[1, 1, 1.75]} look={cameraLook}>
                    <FPSBody
                      radius={0.3}
                      movement={wasdMovement}
                      look={cameraLook}
                      bodyRef={fpsBodyRef}
                      // also seamlessly transfer relative position, etc
                      cloneBody={exitingFpsBodyRef.current}
                      cloneOrigin={prevExitPoint}
                    />
                  </FPSCamera>
                ) : null}
              </TopDownPhysics>
            </React.Suspense>
          </group>
        );
      })}
    </group>
  );
};
