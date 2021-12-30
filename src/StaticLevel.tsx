import React, { useState } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';

import { Body } from './physics';
import { CSGModel, Op, Shape } from './csg';
import { applyUVProjection } from './uvProjection';
import { createFloorFromVolume } from './levelPhysics';

export const Corridor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <group>
      <Shape type="cuboid" center={[0, 0, 0.5]} size={[1, 5, 1]} />

      <mesh
        position={[0, 0, 1.05]}
        rotation={new THREE.Euler(Math.PI, 0, 0)}
        receiveShadow
      >
        <planeGeometry args={[0.25, 0.25]} />
        <meshStandardMaterial
          color="#202020"
          emissive={new THREE.Color(color || '#ffffa0')}
          emissiveIntensity={2}
        />

        <Shape type="cuboid" center={[0, 0, 0]} size={[0.25, 0.25, 0.1]} />
      </mesh>
    </group>
  );
};

export const StaticLevel: React.FC = () => {
  const [floorBody, setFloorBody] = useState<React.ReactElement | null>(null);
  const [lightmapActive, setLightmapActive] = useState(false);

  return (
    <Lightmap
      disabled={!lightmapActive}
      texelsPerUnit={2}
      samplerSettings={{ targetSize: 32 }}
    >
      <CSGModel
        onReady={(geometry, volume) => {
          // add our own extra UV logic
          applyUVProjection(geometry);
          setFloorBody(createFloorFromVolume(volume));

          setLightmapActive(true);
        }}
      >
        <Op type="union">
          <group position={[0.5, 0.5, 0]}>
            <Corridor />
          </group>
          <group position={[0.5, 4.5, 0]}>
            <Corridor />
          </group>
          <group position={[4.5, 0.5, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[4.5, 4.5, 0]}>
            <Corridor color="#000000" />
          </group>
          <group position={[2.5, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor />
          </group>
          <group position={[2.5, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#c08000" />
          </group>
          <group position={[2.5, 6.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Corridor color="#000000" />
          </group>
        </Op>

        {floorBody}
      </CSGModel>

      <pointLight color="#f0f0ff" position={[3.25, 6.25, 0.125]} castShadow />

      <ambientLight color="#202020" />
    </Lightmap>
  );
};
