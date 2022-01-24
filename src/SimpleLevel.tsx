import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';
import { LevelCompletionCallback, LevelRenderer } from './LevelSequence';
import { DemoEndLevel } from './DemoEndLevel';
import { Elevator } from './level/Elevator';
import { UtilityCorridor } from './level/UtilityCorridor';

const rampMatrix = new THREE.Matrix4();
rampMatrix.makeShear(0, 0.5, 0, 0, 0, 0);

export const SimpleLevel: React.FC<{
  onComplete: LevelCompletionCallback;
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

        <group position={[1, 5, 0]}>
          <UtilityCorridor />
        </group>
        <group position={[1, 9, 0]}>
          <UtilityCorridor />
        </group>

        <group position={[1, 13, 0]}>
          <Elevator
            isReceiving
            isLocked={elevatorLocked}
            onEntered={() => {
              setElevatorLocked(true);

              // set up next level
              onComplete(
                Math.random() < 0.1
                  ? cb => <DemoEndLevel />
                  : cb => <SimpleLevel onComplete={cb} />,
                [1, 13]
              );
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
          <Elevator isLocked={false} />
        </group>
      </LevelMesh>
    </>
  );
};
