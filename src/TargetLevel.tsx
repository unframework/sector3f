import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

import { Elevator } from './level/Elevator';

export const TargetLevel: React.FC = () => {
  return (
    <LevelMesh>
      <CSGContent>
        <mesh position={[0, -4, 1.5]}>
          <boxBufferGeometry args={[2, 8, 3]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <group position={[0, -10, 0]} rotation={[0, 0, Math.PI]}>
        <Elevator isLocked={false} onInside={() => {}} />
      </group>
    </LevelMesh>
  );
};
