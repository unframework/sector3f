import React, { useRef, useState, useLayoutEffect } from 'react';
import * as b2 from '@flyover/box2d';
import { useLoader } from '@react-three/fiber';
import { LightmapReadOnly, LightmapIgnore } from '@react-three/lightmap';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { CSGOp, CSGContent } from './csg';
import { LevelMesh, WorldUV } from './levelMesh';

import { Elevator } from './level/Elevator';

const CeilingLamp: React.FC<{ color?: THREE.Color }> = ({ color }) => {
  return (
    <mesh receiveShadow>
      <boxBufferGeometry args={[3, 1, 0.1]} />
      <meshStandardMaterial color="#a0a0a0" />

      <mesh
        position={[0, 0, -0.051]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeBufferGeometry args={[2.8, 0.8]} />
        <meshStandardMaterial
          color="#202020"
          emissive={color || new THREE.Color('#ffff80')}
          emissiveIntensity={1.2}
        />
      </mesh>
    </mesh>
  );
};

// @todo add non-lightmapped flicker to one of the far lamps
export const DemoEndLevel: React.FC = () => {
  const [{ eyeColor }, spring] = useSpring(() => ({
    config: { tension: 200, friction: 35, clamp: true },
    eyeColor: '#000000'
  }));

  const hasTouchedRef = useRef(false);

  return (
    <LevelMesh>
      <CSGContent
        material={[
          'wallpaper',
          'wallpaper',
          'wallpaper',
          'wallpaper',
          'ceilingTile',
          'carpet'
        ]}
      >
        <mesh position={[1, 19, 1.5]}>
          <boxBufferGeometry args={[5, 32, 3]} />
          <WorldUV />
        </mesh>
      </CSGContent>

      <LightmapReadOnly>
        <group position={[1, 5, 2.95]}>
          <CeilingLamp />
        </group>
        <group position={[1, 9, 2.95]}>
          <CeilingLamp />
        </group>
        <group position={[1, 13, 2.95]}>
          <CeilingLamp color={new THREE.Color('#404010')} />
        </group>
        <group position={[1, 17, 2.95]}>
          <CeilingLamp color={new THREE.Color('#000000')} />
        </group>
        <group position={[1, 21, 2.95]}>
          <CeilingLamp color={new THREE.Color('#000000')} />
        </group>
        <group position={[1, 25, 2.95]}>
          <CeilingLamp color={new THREE.Color('#000000')} />
        </group>
      </LightmapReadOnly>

      <LightmapIgnore>
        <mesh
          position={[1, 34.995, 2]}
          rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
        >
          <circleBufferGeometry args={[2, 32]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh
          position={[0.2, 34.99, 2]}
          rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
        >
          <planeBufferGeometry args={[0.2, 0.075]} />
          <animated.meshStandardMaterial
            color="#000000"
            emissive={(eyeColor as unknown) as THREE.Color}
            emissiveIntensity={0.8}
          />
        </mesh>
        <mesh
          position={[1.8, 34.99, 2]}
          rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
        >
          <planeBufferGeometry args={[0.2, 0.075]} />
          <animated.meshStandardMaterial
            color="#000000"
            emissive={(eyeColor as unknown) as THREE.Color}
            emissiveIntensity={0.8}
          />
        </mesh>
      </LightmapIgnore>

      <group position={[1, 1, 0]} rotation={[0, 0, Math.PI]}>
        <Elevator
          isLocked={false}
          onTouching={isTouching => {
            if (isTouching) {
              hasTouchedRef.current = true;
            } else if (hasTouchedRef.current) {
              console.log('hi!');
              spring.start({ eyeColor: '#ff0000' });
            }
          }}
        />
      </group>
    </LevelMesh>
  );
};
