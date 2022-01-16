import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { Op, Shape, CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh } from './levelMesh';

// export const Corridor: React.FC<{ color?: string }> = ({ color }) => {
//   return (
//     <group>
//       <Shape type="cuboid" center={[0, 0, 1]} size={[2, 10, 2]} />

//       <mesh
//         position={[0, 0, 2.05]}
//         rotation={new THREE.Euler(Math.PI, 0, 0)}
//         receiveShadow
//       >
//         <planeGeometry args={[0.5, 0.5]} />
//         <meshStandardMaterial
//           color="#202020"
//           emissive={new THREE.Color(color || '#ffffa0')}
//           emissiveIntensity={2}
//         />

//         <Shape type="cuboid" center={[0, 0, 0]} size={[0.5, 0.5, 0.1]} />
//       </mesh>
//     </group>
//   );
// };

export const StaticLevel: React.FC = () => {
  const rampMatrix = new THREE.Matrix4();
  rampMatrix.makeShear(0, 1, 0, 0, 0, 0);

  return (
    <>
      <LevelMesh>
        <CSGRoot>
          <CSGOp type="union">
            <group matrix={rampMatrix} matrixAutoUpdate={false}>
              <CSGContent>
                <mesh position={[-2, 1, 1.5]}>
                  <boxBufferGeometry args={[4, 2, 3]} />
                </mesh>
              </CSGContent>
            </group>

            <CSGContent>
              <mesh position={[0, 1, 1.5]}>
                <boxBufferGeometry args={[1, 2, 1]} />
              </mesh>
            </CSGContent>
          </CSGOp>
        </CSGRoot>

        {/*<Op type="union">*/}
        {/*<group matrix={rampMatrix} matrixAutoUpdate={false}>
            <Shape type="cuboid" center={[-2, 1, 1.5]} size={[4, 2, 3]} />
          </group>*/}

        {/*<group position={[1, 1, 0]}>
            <Corridor />
          </group>
          <group position={[1, 9, 0]}>
            <Corridor />
          </group>
          <group position={[9, 1, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[9, 9, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[5, -3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor />
          </group>
          <group position={[5, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#c08000" />
          </group>
          <group position={[5, 13, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#000000" />
          </group>*/}
        {/*</Op>*/}
      </LevelMesh>

      <pointLight color="#f0f0ff" position={[6.5, 12.5, 0.25]} castShadow />

      <ambientLight color="#202020" />
    </>
  );
};
