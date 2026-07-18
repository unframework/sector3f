import React, { useMemo } from 'react';
import { Text as TroikaTextMesh } from 'troika-three-text';
import * as THREE from 'three';

import { useWASD, useCameraLook } from './wasd';
import { FPSBody } from './physics';
import { LevelSequence } from './LevelSequence';
import { FPSCamera } from './FPSCamera';

export const MainStage: React.FC = () => {
  const cameraLook = useCameraLook();
  const wasdMovement = useWASD();

  const troikaMesh = useMemo(() => {
    const textMesh = new TroikaTextMesh();
    textMesh.text = 'Loading...';
    textMesh.fontSize = 0.5;
    textMesh.anchorX = 'center';
    textMesh.anchorY = 'center';
    textMesh.sync();

    return textMesh;
  }, []);

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
        initialLoader={
          <group
            position={[1, 3.8, 1.65]}
            rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
          >
            <primitive object={troikaMesh}>
              <meshBasicMaterial color="#40ffff" />
            </primitive>
          </group>
        }
      />
    </group>
  );
};
