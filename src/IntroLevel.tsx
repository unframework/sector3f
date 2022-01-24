import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';
import { LevelCompletionCallback, LevelRenderer } from './LevelSequence';

import { SimpleLevel } from './SimpleLevel';
import { Elevator } from './level/Elevator';

export const IntroLevel: React.FC<{
  onComplete: LevelCompletionCallback;
}> = ({ onComplete }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // trigger once any suspense is finished (by delaying and setting state first)
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    if (!ready) {
      setTimeout(() => {
        setReady(true);
      }, 500);
    } else {
      onCompleteRef.current(cb => <SimpleLevel onComplete={cb} />, [1, 1]);
    }
  }, [ready]);

  return (
    <LevelMesh>
      <group position={[1, 1, 0]}>
        <Elevator isLocked={true} />
      </group>
    </LevelMesh>
  );
};
