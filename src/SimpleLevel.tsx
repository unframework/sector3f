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
          <UtilityCorridor />
        </group>
        <group position={[-1, 11, 0]} rotation={[0, 0, Math.PI / 2]}>
          <UtilityCorridor color="#000000" />
        </group>
        <group position={[-3, 9, 0]}>
          <UtilityCorridor color="#ffff00" />
        </group>
        <group position={[-3, 13, 0]}>
          <UtilityCorridor color="#000000" />
        </group>

        <group position={[1, 17, 0]}>
          <Elevator
            isReceiving
            isLocked={elevatorLocked}
            onEntered={() => {
              setElevatorLocked(true);

              // set up next level
              onComplete(cb => <DemoEndLevel />, [1, 17]);
            }}
          />
        </group>

        <group position={[1, 1, 0]} rotation={[0, 0, Math.PI]}>
          <Elevator isLocked={false} />
        </group>
      </LevelMesh>
    </>
  );
};
