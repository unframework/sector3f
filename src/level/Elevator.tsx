import React, { useRef, useState } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { AutoUV2Ignore } from '@react-three/lightmap';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { CSGContent } from '../csg';
import { WorldUV } from '../levelMesh';
import { Body, Sensor } from '../physics';

// texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
import panelTextureUrl from './panels.png';

export const Elevator: React.FC = () => {
  // @todo dedupe
  const panelTexture = useLoader(THREE.TextureLoader, panelTextureUrl);
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;

  const [elevatorLocked, setElevatorLocked] = useState(false);
  const insideRef = useRef(false); // no need for useState here

  const [{ leftDoorPos, rightDoorPos }, spring] = useSpring(() => ({
    config: { tension: 300, friction: 35 },
    onRest: props => {
      if (!props.value.open) {
        // when door has finished closing, check if we need to lock it
        if (insideRef.current) {
          setElevatorLocked(true);
        }
      }
    },
    leftDoorPos: [-0.5, 0, 0.9],
    rightDoorPos: [0.5, 0, 0.9],
    open: false // stash the intended door state for onRest
  }));

  return (
    <>
      <CSGContent
        material={[
          'elevator',
          'elevator',
          'elevator',
          'elevator',
          'elevatorCeiling',
          'floorLight'
        ]}
      >
        <mesh position={[0, 0, 1]}>
          <boxBufferGeometry args={[3.6, 3.6, 2]} />
          <WorldUV scale={0.25} />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, -1.9, 0.9]}>
          <boxBufferGeometry args={[2, 0.2, 1.8]} />
          <WorldUV scale={0.25} />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, 1.9, 0.9]}>
          <boxBufferGeometry args={[2, 0.2, 1.8]} />
          <WorldUV scale={0.25} />
        </mesh>
      </CSGContent>

      <mesh
        position={[0, 0, 0.002]}
        // rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[3.4, 3.4]} />
        <MeshReflectorMaterial
          color="#c0c0c0"
          blur={[400, 400]}
          mirror={0.1}
          resolution={512}
          mixBlur={1}
          mixStrength={0.85}
          depthScale={0.5}
          minDepthThreshold={0.1}
          maxDepthThreshold={1.5}
          metalness={0}
          roughness={1}
        />
      </mesh>

      <AutoUV2Ignore>
        <group position={[0, -1.9, 0]}>
          <animated.mesh position={leftDoorPos as any} castShadow>
            <boxBufferGeometry args={[1, 0.15, 1.8]} />
            <meshStandardMaterial color="#b0b4b4" map={panelTexture} />
            <Body isKinematic />
            <WorldUV scale={0.25} />
          </animated.mesh>

          <animated.mesh position={rightDoorPos as any} castShadow>
            <boxBufferGeometry args={[1, 0.15, 1.8]} />
            <meshStandardMaterial color="#b0b4b4" map={panelTexture} />
            <Body isKinematic />
            <WorldUV scale={0.25} />
          </animated.mesh>
        </group>
      </AutoUV2Ignore>

      <Sensor
        initShape={() => {
          const shape = new b2.PolygonShape();
          shape.SetAsBox(2.5, 1, new b2.Vec2(0, -2.15));
          return shape;
        }}
        onChange={isColliding => {
          const doorOpen = isColliding && !elevatorLocked;

          spring.start({
            leftDoorPos: [doorOpen ? -1.4 : -0.5, 0, 0.9],
            rightDoorPos: [doorOpen ? 1.4 : 0.5, 0, 0.9],
            open: doorOpen
          });
        }}
      />

      <Sensor
        initShape={() => {
          const shape = new b2.PolygonShape();
          shape.SetAsBox(2, 2, new b2.Vec2(0, 0));
          return shape;
        }}
        onChange={isColliding => {
          console.log('inside?', isColliding);
          insideRef.current = isColliding;
        }}
      />

      <pointLight
        position={[0, 0, 1.75]}
        distance={8}
        decay={2}
        color="#f0ffff"
        castShadow
        intensity={0.75}
      />
    </>
  );
};
