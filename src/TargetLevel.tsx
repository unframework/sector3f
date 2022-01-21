import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

export const TargetLevel: React.FC = () => {
  return (
    <LevelMesh>
      <CSGContent>
        <mesh position={[0, 0, 1]}>
          <boxBufferGeometry args={[4, 4, 2]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <pointLight
        position={[0, 0, 1.75]}
        distance={8}
        decay={2}
        color="#f0ffff"
        castShadow
        intensity={0.75}
      />
    </LevelMesh>
  );
};
