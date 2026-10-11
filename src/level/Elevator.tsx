import React, { useRef, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import { LightmapReadOnly, LightmapIgnore } from '../lightmapShims';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { CSGContent } from '../csg';
import { WorldUV } from '../levelMesh';
import { Body, Sensor } from '../physics';

export const Elevator: React.FC<{
  isReceiving?: boolean;
  isLocked: boolean;
  onEntered?: () => void;
  onTouching?: (isTouching: boolean) => void;
}> = ({ isReceiving, isLocked, onEntered, onTouching }) => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotLightTargetRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    spotLightRef.current!.target = spotLightTargetRef.current!;
  }, []);

  // @todo dedupe
  // texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
  const panelTexture = useLoader(
    THREE.TextureLoader,
    'assets/opengameart/panels.png'
  );
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;
  panelTexture.repeat.set(0.25, 0.25);

  const insideRef = useRef(false); // no need for useState here

  // track latest callback instance
  const onEnteredRef = useRef(onEntered);
  onEnteredRef.current = onEntered;
  const onTouchingRef = useRef(onTouching);
  onTouchingRef.current = onTouching;

  const [{ leftDoorPos, rightDoorPos }, spring] = useSpring(() => ({
    config: { tension: 300, friction: 35 },
    onRest: props => {
      if (!props.value.open) {
        // when door has finished closing, check if we need to lock it
        if (insideRef.current && onEnteredRef.current) {
          onEnteredRef.current();
        }
      }
    },
    leftDoorPos: [-0.4, 0, 1.1],
    rightDoorPos: [0.4, 0, 1.1],
    open: false // stash the intended door state for onRest
  }));

  const entryColor = isLocked
    ? new THREE.Color('#ff0000')
    : isReceiving
    ? new THREE.Color('#000000')
    : new THREE.Color('#00ff00');
  const exitColor = isLocked
    ? new THREE.Color('#ff0000')
    : isReceiving
    ? new THREE.Color('#000000')
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
          <boxGeometry args={[3.2, 3.2, 2.5]} />
          <WorldUV />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, -1.8, 1.1]}>
          <boxGeometry args={[1.6, 0.4, 2.2]} />
          <WorldUV />
        </mesh>
      </CSGContent>
      <CSGContent material="elevatorTrim">
        <mesh position={[0, 1.8, 1.1]}>
          <boxGeometry args={[1.6, 0.4, 2.2]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <mesh
        position={[0, 0, 2.498]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>

      {/* movable doors on south side */}
      <LightmapReadOnly>
        <group position={[0, -1.8, 0]}>
          <animated.mesh position={leftDoorPos as any} castShadow>
            <boxGeometry args={[0.8, 0.175, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isKinematic />
            <WorldUV />
          </animated.mesh>

          <animated.mesh position={rightDoorPos as any} castShadow>
            <boxGeometry args={[0.8, 0.175, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isKinematic />
            <WorldUV />
          </animated.mesh>
        </group>

        <group position={[0, isReceiving ? -2.7 : -1.7, 0]}>
          <Sensor
            initShape={() => {
              const shape = new b2.PolygonShape();
              shape.SetAsBox(2.5, isReceiving ? 0.6 : 1);
              return shape;
            }}
            onChange={isColliding => {
              const doorOpen = isColliding && !isLocked;

              spring.start({
                leftDoorPos: [doorOpen ? -1.15 : -0.4, 0, 1.1],
                rightDoorPos: [doorOpen ? 1.15 : 0.4, 0, 1.1],
                open: doorOpen
              });
            }}
          />
        </group>

        {/* fake doors on north side */}
        <group position={[0, 1.8, 0]}>
          <mesh position={[-0.4, 0, 1.1]} castShadow>
            <boxGeometry args={[0.8, 0.175, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isStatic />
            <WorldUV />
          </mesh>

          <mesh position={[0.4, 0, 1.1]} castShadow>
            <boxGeometry args={[0.8, 0.175, 2.2]} />
            <meshStandardMaterial color="#cfcfc0" map={panelTexture} />
            <Body isStatic />
            <WorldUV />
          </mesh>
        </group>
      </LightmapReadOnly>

      <LightmapIgnore>
        <mesh position={[-1.2, -1.58, 1.8]}>
          <boxGeometry args={[0.36, 0.04, 0.48]} />
          <meshStandardMaterial
            color="#404040"
            emissive={entryColor}
            emissiveIntensity={1.2}
            roughness={0.9}
          />
        </mesh>
        <mesh position={[1.2, -1.58, 1.8]}>
          <boxGeometry args={[0.36, 0.04, 0.48]} />
          <meshStandardMaterial
            color="#404040"
            emissive={entryColor}
            emissiveIntensity={1.2}
            roughness={0.9}
          />
        </mesh>

        <mesh position={[-1.2, 1.58, 1.8]}>
          <boxGeometry args={[0.36, 0.04, 0.48]} />
          <meshStandardMaterial
            color="#404040"
            emissive={exitColor}
            emissiveIntensity={1.2}
            roughness={0.9}
          />
        </mesh>
        <mesh position={[1.2, 1.58, 1.8]}>
          <boxGeometry args={[0.36, 0.04, 0.48]} />
          <meshStandardMaterial
            color="#404040"
            emissive={exitColor}
            emissiveIntensity={1.2}
            roughness={0.9}
          />
        </mesh>
      </LightmapIgnore>

      <Sensor
        initShape={() => {
          const shape = new b2.PolygonShape();
          shape.SetAsBox(1.6, 1.6, new b2.Vec2(0, 0));
          return shape;
        }}
        onChange={isColliding => {
          insideRef.current = isColliding;

          if (onTouchingRef.current) {
            onTouchingRef.current(isColliding);
          }
        }}
      />

      {/* extra lights just for door shadows */}
      <LightmapIgnore>
        <pointLight
          position={[0, 0, 1.5]}
          distance={6}
          decay={2}
          color="#f0ffff"
          castShadow
          intensity={0.75}
        />

        <spotLight
          position={[0, -2.5, 2.5]}
          distance={4}
          decay={2}
          penumbra={0.8}
          angle={1}
          color="#c0ffff"
          intensity={1.5}
          castShadow
          ref={spotLightRef}
        />

        <group position={[0, -2.4, 0]} ref={spotLightTargetRef} />
      </LightmapIgnore>
    </>
  );
};
