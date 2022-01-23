import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import { LightmapReadOnly, LightmapIgnore } from '@react-three/lightmap';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { CSGContent } from '../csg';
import { WorldUV } from '../levelMesh';
import { Body, Sensor } from '../physics';

export const Elevator: React.FC<{
  waitingSignal?: boolean;
  isLocked: boolean;
  onInside: () => void;
}> = ({ waitingSignal, isLocked, onInside }) => {
  // @todo dedupe
  // texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
  const panelTexture = useLoader(
    THREE.TextureLoader,
    '/assets/opengameart/panels.png'
  );
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;
  panelTexture.repeat.set(0.25, 0.25);

  const insideRef = useRef(false); // no need for useState here

  // track latest callback instance
  const onInsideRef = useRef(onInside);
  onInsideRef.current = onInside;

  const [{ leftDoorPos, rightDoorPos }, spring] = useSpring(() => ({
    config: { tension: 300, friction: 35 },
    onRest: props => {
      if (!props.value.open) {
        // when door has finished closing, check if we need to lock it
        if (insideRef.current) {
          onInsideRef.current();
        }
      }
    },
    leftDoorPos: [-0.5, 0, 1.1],
    rightDoorPos: [0.5, 0, 1.1],
    open: false // stash the intended door state for onRest
  }));

  // set up after-init flag to render meshes once lightmap is complete
  // @todo proper lightmap opt-out
  const [afterInit, setAfterInit] = useState(false);
  useLayoutEffect(() => {
    setTimeout(() => {
      setAfterInit(true);
    }, 0);
  }, []);

  const entryColor = isLocked
    ? new THREE.Color('#ff0000')
    : waitingSignal
    ? new THREE.Color('#202020')
    : new THREE.Color('#00ff00');
  const exitColor = isLocked
    ? new THREE.Color('#ff0000')
    : waitingSignal
    ? new THREE.Color('#202020')
    : new THREE.Color('#ff0000');

  return (
    <>
      <CSGContent
        material={[
          'elevator',
          'elevator',
          'elevator',
          'elevator',
          'solidLight',
          'elevatorFloor'
        ]}
      >
        <mesh position={[0, 0, 1.25]}>
          <boxBufferGeometry args={[3.6, 3.6, 2.5]} />
          <WorldUV />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, -1.9, 1.1]}>
          <boxBufferGeometry args={[2, 0.2, 2.2]} />
          <WorldUV />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, 1.9, 1.1]}>
          <boxBufferGeometry args={[2, 0.2, 2.2]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <mesh
        position={[0, 0, 2.498]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[3.4, 3.4]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>

      {/* movable doors on south side */}
      <LightmapReadOnly>
        <group position={[0, -1.9, 0]}>
          <animated.mesh position={leftDoorPos as any} castShadow>
            <boxBufferGeometry args={[1, 0.15, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isKinematic />
            <WorldUV />
          </animated.mesh>

          <animated.mesh position={rightDoorPos as any} castShadow>
            <boxBufferGeometry args={[1, 0.15, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isKinematic />
            <WorldUV />
          </animated.mesh>

          <Sensor
            initShape={() => {
              const shape = new b2.PolygonShape();
              shape.SetAsBox(2.5, 1);
              return shape;
            }}
            onChange={isColliding => {
              const doorOpen = isColliding && !isLocked;

              spring.start({
                leftDoorPos: [doorOpen ? -1.4 : -0.5, 0, 1.1],
                rightDoorPos: [doorOpen ? 1.4 : 0.5, 0, 1.1],
                open: doorOpen
              });
            }}
          />
        </group>

        {/* fake doors on north side */}
        <group position={[0, 1.9, 0]}>
          <mesh position={[-0.5, 0, 1.1]} castShadow>
            <boxBufferGeometry args={[1, 0.15, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isStatic />
            <WorldUV />
          </mesh>

          <mesh position={[0.5, 0, 1.1]} castShadow>
            <boxBufferGeometry args={[1, 0.15, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isStatic />
            <WorldUV />
          </mesh>
        </group>

        <mesh position={[0, -1.75, 2.3]}>
          <boxBufferGeometry args={[2.2, 0.1, 0.15]} />
          <meshStandardMaterial
            color="#101010"
            emissive={afterInit ? entryColor : undefined}
            emissiveIntensity={1.2}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.75, 2.3]}>
          <boxBufferGeometry args={[2.2, 0.1, 0.15]} />
          <meshStandardMaterial
            color="#101010"
            emissive={afterInit ? exitColor : undefined}
            emissiveIntensity={1.2}
            roughness={0.3}
          />
        </mesh>
      </LightmapReadOnly>

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

      {/* extra light just for door shadows */}
      <LightmapIgnore>
        <pointLight
          position={[0, 0, 1.8]}
          distance={6}
          decay={2}
          color="#f0ffff"
          castShadow
          intensity={0.75}
        />
      </LightmapIgnore>
    </>
  );
};
