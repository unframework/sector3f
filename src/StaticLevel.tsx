import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

import { Elevator } from './level/Elevator';
import { UtilityCorridor } from './level/UtilityCorridor';

const rampMatrix = new THREE.Matrix4();
rampMatrix.makeShear(0, 0.5, 0, 0, 0, 0);

export const StaticLevel: React.FC<{
  onComplete: (teleportOrigin: [number, number]) => void;
}> = ({ onComplete }) => {
  const spotLightRef = useRef<THREE.SpotLight>();
  const spotLightTargetRef = useRef<THREE.Object3D>();
  useLayoutEffect(() => {
    spotLightRef.current!.target = spotLightTargetRef.current!;
  }, []);

  const [elevatorLocked, setElevatorLocked] = useState(false);

  return (
    <>
      <LevelMesh>
        {/*<group matrix={rampMatrix} matrixAutoUpdate={false}>
          <CSGContent>
            <mesh position={[-2, 1, 1.5]}>
              <boxBufferGeometry args={[4, 2, 3]} />
              <WorldUV />
            </mesh>
          </CSGContent>
        </group>*/}

        <group position={[1, 7, 0]}>
          <UtilityCorridor />
        </group>

        <group position={[1, 13, 0]}>
          <Elevator
            waitingSignal
            isLocked={elevatorLocked}
            onInside={() => {
              setElevatorLocked(true);
              onComplete([1, 13]);
            }}
          />

          <spotLight
            position={[0, -2.4, 2.5]}
            distance={4}
            decay={2}
            penumbra={0.8}
            angle={1}
            color="#c0ffff"
            intensity={1.5}
            castShadow
            ref={spotLightRef}
          />

          <group position={[0, -2.5, 0]} ref={spotLightTargetRef} />
        </group>

        <group position={[1, 1, 0]} rotation={[0, 0, Math.PI]}>
          <Elevator isLocked={false} onInside={() => {}} />
        </group>
      </LevelMesh>
    </>
  );
};
