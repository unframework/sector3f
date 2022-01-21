import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

import { Elevator } from './level/Elevator';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
import concreteTextureUrl from './ft_conc01_c.png';

// texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
import panelTextureUrl from './level/panels.png';

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

export const StaticLevel: React.FC<{
  onComplete: (teleportOrigin: [number, number]) => void;
}> = ({ onComplete }) => {
  const concreteTexture = useLoader(THREE.TextureLoader, concreteTextureUrl);
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;

  const panelTexture = useLoader(THREE.TextureLoader, panelTextureUrl);
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;
  // panelTexture.magFilter = THREE.NearestFilter;

  const spotLightRef = useRef<THREE.SpotLight>();
  const spotLightTargetRef = useRef<THREE.Object3D>();
  useLayoutEffect(() => {
    spotLightRef.current!.target = spotLightTargetRef.current!;
  }, []);

  const [elevatorLocked, setElevatorLocked] = useState(false);

  return (
    <>
      <LevelMesh
        materials={{
          default: <meshStandardMaterial map={concreteTexture} />,
          floorLight: (
            <meshStandardMaterial
              color="#f0f8ff"
              emissive={new THREE.Color('#f0f8ff')}
            />
          ),
          elevator: <meshStandardMaterial color="#a0a0a0" map={panelTexture} />,
          elevatorCeiling: <meshStandardMaterial color="#404040" />,
          elevatorTrim: <meshStandardMaterial color="#202020" />
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
          <Elevator
            waitingSignal
            isLocked={elevatorLocked}
            onInside={() => {
              setElevatorLocked(true);
              onComplete([1, 2]);
            }}
          />

          <spotLight
            position={[0, -2.4, 2]}
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

        <group position={[1, -12, 0]} rotation={[0, 0, Math.PI]}>
          <Elevator isLocked={false} onInside={() => {}} />
        </group>
      </LevelMesh>

      <ambientLight color="#202020" />
    </>
  );
};
