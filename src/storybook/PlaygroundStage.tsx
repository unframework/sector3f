import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

import { useWASD, useCameraLook } from '../wasd';
import { FPSCamera } from '../FPSCamera';
import { FPSBody, TopDownPhysics } from '../physics';

// runs a scene through the same render/physics/input loop as the real game
// (see src/index.tsx + src/MainStage.tsx + src/LevelSequence.tsx), minus the
// multi-level stacking/teleport machinery, so a single level or fixture can
// be dropped in and played directly from a story
export const PlaygroundStage: React.FC = ({ children }) => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  useEffect(() => {
    // requestPointerLock() must target document.body specifically -
    // useCameraLook() checks document.pointerLockElement === document.body
    const requestLock = () => document.body.requestPointerLock();
    document.body.addEventListener('click', requestLock);
    return () => document.body.removeEventListener('click', requestLock);
  }, []);

  return (
    <Canvas shadows style={{ height: '100vh' }} gl={{ alpha: false }}>
      <React.Suspense fallback={null}>
        <ambientLight color="#202020" />

        <TopDownPhysics>
          {children}

          {/* levels are authored assuming the player spawns near local (1, 1, z) -
              see the matching offset in LevelSequence.tsx around its camera render prop */}
          <group position={[1, 1, 0]}>
            <FPSCamera position={[0, 0, 1.75]} look={cameraLook}>
              <FPSBody radius={0.3} movement={wasdMovement} look={cameraLook} />
            </FPSCamera>
          </group>
        </TopDownPhysics>
      </React.Suspense>

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          height={300}
        />
      </EffectComposer>
    </Canvas>
  );
};
