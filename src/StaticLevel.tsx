import React from 'react';
import { useLoader } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
import testTextureUrl from './ft_conc01_c.png';

export const Corridor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <group>
      <CSGContent>
        <mesh position={[0, 0, 1]}>
          <boxBufferGeometry args={[2, 10, 2]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <mesh
        position={[0, 0, 2.05]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial
          color="#202020"
          emissive={new THREE.Color(color || '#ffffe0')}
          emissiveIntensity={2}
        />

        <CSGContent>
          <mesh>
            <boxBufferGeometry args={[0.5, 0.5, 0.1]} />
            <WorldUV />
          </mesh>
        </CSGContent>
      </mesh>
    </group>
  );
};

export const StaticLevel: React.FC = () => {
  const rampMatrix = new THREE.Matrix4();
  rampMatrix.makeShear(0, 1, 0, 0, 0, 0);

  const testTexture = useLoader(THREE.TextureLoader, testTextureUrl);
  testTexture.wrapS = THREE.RepeatWrapping;
  testTexture.wrapT = THREE.RepeatWrapping;
  // testTexture.magFilter = THREE.NearestFilter;

  return (
    <>
      <LevelMesh
        materials={{
          default: <meshStandardMaterial map={testTexture} />,
          red: <meshStandardMaterial color="#ff8080" />
        }}
      >
        <group matrix={rampMatrix} matrixAutoUpdate={false}>
          <CSGContent material="red">
            <mesh position={[-2, 1, 1.5]}>
              <boxBufferGeometry args={[4, 2, 3]} />
              <WorldUV />
            </mesh>
          </CSGContent>
        </group>

        <group position={[1, 1, 0]}>
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
        </group>
      </LevelMesh>

      <pointLight color="#f0f0ff" position={[6.5, 12.5, 0.25]} castShadow />

      <ambientLight color="#202020" />
    </>
  );
};
