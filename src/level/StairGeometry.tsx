import React, { useMemo } from 'react';
import * as THREE from 'three';

export const StairGeometry: React.FC = () => {
  const mesh = useMemo(() => {
    const xExtent = 8;
    const zExtent = 4;
    const numSteps = 12;

    const position: number[] = [];
    const normal: number[] = [];

    for (let i = 0; i < numSteps; i += 1) {
      const x1 = (i * xExtent) / numSteps - xExtent * 0.5;
      const x2 = ((i + 1) * xExtent) / numSteps - xExtent * 0.5;
      const z1 = (i * zExtent) / numSteps - zExtent * 0.5;
      const z2 = ((i + 1) * zExtent) / numSteps - zExtent * 0.5;

      // add riser
      position.push(x1, -1, z1, x1, -1, z2, x1, 1, z1);
      position.push(x1, -1, z2, x1, 1, z2, x1, 1, z1);
      normal.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
      normal.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);

      // add stair
      position.push(x1, 1, z2, x1, -1, z2, x2, -1, z2);
      position.push(x2, -1, z2, x2, 1, z2, x1, 1, z2);
      normal.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      normal.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(position, 3)
    );
    result.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));

    return result;
  }, []);

  return <primitive attach="geometry" object={mesh} />;
};
