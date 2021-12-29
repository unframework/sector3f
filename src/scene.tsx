import React, { useState, useRef, useLayoutEffect, useContext } from 'react';
import * as THREE from 'three';

// helper scene object that reads the parent object reference
export const ThreeDummy: React.FC<{
  init: (parentNode: THREE.Object3D) => void; // runs only once in useEffect
}> = ({ init }) => {
  const initRef = useRef(init); // read only once

  const [parentObject, setParentObject] = useState<THREE.Object3D | null>(null);
  const groupRef = useRef<THREE.Object3D | null>(null);

  // @todo consider layout effect?
  useLayoutEffect(() => {
    if (!groupRef.current) {
      throw new Error('must attach to ThreeJS tree');
    }

    const obj3d = groupRef.current.parent;
    if (!obj3d) {
      throw new Error('must attach under ThreeJS object');
    }

    // stop rendering the dummy
    setParentObject(obj3d);

    // notify caller
    initRef.current(obj3d);
  }, []);

  // if parentObject is known, then no need to render the group anymore
  return parentObject ? null : <group ref={groupRef} />;
};
