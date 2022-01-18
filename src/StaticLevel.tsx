import React from 'react';
import { useLoader } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
import concreteTextureUrl from './ft_conc01_c.png';

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

const rampMatrix = new THREE.Matrix4();
rampMatrix.makeShear(0, 0.5, 0, 0, 0, 0);

export const StaticLevel: React.FC = () => {
  const concreteTexture = useLoader(THREE.TextureLoader, concreteTextureUrl);
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;
  // concreteTexture.magFilter = THREE.NearestFilter;

  return (
    <>
      <LevelMesh
        materials={{
          default: <meshStandardMaterial map={concreteTexture} />
        }}
      >
        {/*<group matrix={rampMatrix} matrixAutoUpdate={false}>
          <CSGContent>
            <mesh position={[-2, 1, 1.5]}>
              <boxBufferGeometry args={[4, 2, 3]} />
              <WorldUV />
            </mesh>
          </CSGContent>
        </group>*/}

        <group position={[1, -5, 0]}>
          <Corridor />
        </group>
        <group position={[1, 2, 0]}>
          <CSGContent>
            <mesh position={[0, 0, 1]}>
              <boxBufferGeometry args={[4, 4, 2]} />
              <WorldUV />
            </mesh>
          </CSGContent>

          <mesh
            position={[0, 0, 1.95]}
            rotation={new THREE.Euler(Math.PI, 0, 0)}
            receiveShadow
          >
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
              color="#202020"
              emissive={new THREE.Color('#f0f8ff')}
              emissiveIntensity={1}
            />
          </mesh>
        </group>
      </LevelMesh>

      <ambientLight color="#202020" />
    </>
  );
};
