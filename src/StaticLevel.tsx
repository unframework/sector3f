import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import { MeshReflectorMaterial, SpotLight } from '@react-three/drei';
import { AutoUV2Ignore } from '@react-three/lightmap';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { CSGRoot, CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';
import { Body, Sensor } from './physics';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
import concreteTextureUrl from './ft_conc01_c.png';

// texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
import panelTextureUrl from './panels.png';

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

  const panelTexture = useLoader(THREE.TextureLoader, panelTextureUrl);
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;
  // panelTexture.magFilter = THREE.NearestFilter;

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
    leftDoorPos: [-0.5, 0, 1],
    rightDoorPos: [0.5, 0, 1],
    open: false // stash the intended door state for onRest
  }));

  const spotLightRef = useRef<THREE.SpotLight>();
  const spotLightTargetRef = useRef<THREE.Object3D>();
  useLayoutEffect(() => {
    spotLightRef.current!.target = spotLightTargetRef.current!;
  }, []);

  return (
    <>
      <LevelMesh
        materials={{
          default: <meshStandardMaterial map={concreteTexture} />,
          floorLight: (
            <meshStandardMaterial
              color="#f0f8ff"
              emissive={new THREE.Color('#f0f8ff')}
              emissiveIntensity={0.4}
            />
          ),
          elevator: <meshStandardMaterial color="#a0a0a0" map={panelTexture} />,
          elevatorCeiling: <meshStandardMaterial color="#404040" />
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
              <boxBufferGeometry args={[4, 4, 2]} />
              <WorldUV scale={0.25} />
            </mesh>
          </CSGContent>

          <mesh
            position={[0, 0, 0.002]}
            // rotation={new THREE.Euler(Math.PI, 0, 0)}
            receiveShadow
          >
            <planeGeometry args={[3.8, 3.8]} />
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
            <group position={[0, -2.15, 0]}>
              <animated.mesh position={leftDoorPos as any} castShadow>
                <boxBufferGeometry args={[1, 0.2, 2]} />
                <meshStandardMaterial color="#a8b0b0" map={panelTexture} />
                <Body isKinematic />
                <WorldUV scale={0.25} />
              </animated.mesh>

              <animated.mesh position={rightDoorPos as any} castShadow>
                <boxBufferGeometry args={[1, 0.2, 2]} />
                <meshStandardMaterial color="#a8b0b0" map={panelTexture} />
                <Body isKinematic />
                <WorldUV scale={0.25} />
              </animated.mesh>

              <spotLight
                position={[0, -0.3, 2]}
                distance={4}
                decay={2}
                penumbra={0.8}
                angle={1}
                color="#c0ffff"
                intensity={1.5}
                castShadow
                ref={spotLightRef}
              />

              <group position={[0, -0.5, 0]} ref={spotLightTargetRef} />
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
                leftDoorPos: [doorOpen ? -1.4 : -0.5, 0, 1],
                rightDoorPos: [doorOpen ? 1.4 : 0.5, 0, 1],
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
        </group>
      </LevelMesh>

      <ambientLight color="#202020" />
    </>
  );
};
