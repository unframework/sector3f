import React, { useLayoutEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { booleans, primitives, geometries } from '@jscad/modeling';

import { useWASD, useCameraLook } from './wasd';
import { TopDownPhysics, Body, FPSBody } from './physics';

// @todo rejoin the split-up polygons (with matching plane only) to avoid seams
function createBufferFromPolys(polys: geometries.poly3.Poly3[]) {
  const geometry = new THREE.BufferGeometry();

  let vertexCount = 0;
  let faceCount = 0;
  for (let i = 0; i < polys.length; i += 1) {
    vertexCount += polys[i].vertices.length;
    faceCount += polys[i].vertices.length - 2;
  }

  const indexAttr = new THREE.Uint16BufferAttribute(faceCount * 3, 3);
  indexAttr.count = faceCount * 3;
  const positionAttr = new THREE.Float32BufferAttribute(vertexCount * 3, 3);
  const normalAttr = new THREE.Float32BufferAttribute(vertexCount * 3, 3);

  let vertexIndex = 0;
  let faceIndex = 0;
  for (let i = 0; i < polys.length; i += 1) {
    const poly = polys[i];
    const vertices = poly.vertices;
    const plane = ((poly as unknown) as Record<string, unknown>)
      .plane as number[]; // @todo typing
    const firstVertexIndex = vertexIndex;

    for (let j = 0; j < vertices.length; j += 1) {
      const vert = vertices[j];
      positionAttr.setXYZ(vertexIndex, vert[0], vert[1], vert[2]);
      normalAttr.setXYZ(vertexIndex, plane[0], plane[1], plane[2]);

      if (j >= 2) {
        indexAttr.setXYZ(
          faceIndex,
          firstVertexIndex,
          vertexIndex - 1,
          vertexIndex
        );
        faceIndex += 1;
      }

      vertexIndex += 1;
    }
  }
  console.log(vertexIndex, faceIndex);

  geometry.setIndex(indexAttr);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('normal', normalAttr);

  return geometry;
}

export const CSGModel: React.FC = () => {
  const geom = useMemo(() => {
    const csg = booleans.union(
      primitives.cylinder({
        center: [0, 0, 1],
        height: 1,
        radius: 1,
        segments: 4
      }),
      primitives.cylinder({
        center: [0, 0.5, 1.5],
        height: 1,
        radius: 1,
        segments: 4
      })
    );

    const polys = csg.polygons;
    // console.log('hi', polys);
    return createBufferFromPolys(polys);
  }, []);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#808080" />
    </mesh>
  );
};

export const MainStage: React.FC = () => {
  const cameraRef = useRef<THREE.Camera | null>(null);
  const cameraLook = useCameraLook(({ yaw, pitch }) => {
    if (!cameraRef.current) {
      return;
    }

    cameraRef.current.quaternion.setFromEuler(
      new THREE.Euler(pitch, 0, yaw, 'ZXY')
    );
  });
  const wasdMovement = useWASD();

  return (
    <TopDownPhysics>
      <group>
        <group position={[0, -2, 0.5]}>
          <PerspectiveCamera
            near={0.075}
            far={100}
            fov={80}
            makeDefault
            ref={cameraRef}
          />
          <FPSBody radius={0.15} movement={wasdMovement} look={cameraLook} />
        </group>

        <CSGModel />

        <mesh position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[5, 5]} />
          {/*<meshStandardMaterial color="#c0c0c8" roughness={0.6} />*/}
          <MeshReflectorMaterial
            color="#c0c0c8"
            blur={[400, 400]}
            mirror={0}
            resolution={1024}
            mixBlur={1}
            mixStrength={0.75}
            depthScale={0.15}
            minDepthThreshold={0.9}
            maxDepthThreshold={1}
            metalness={0}
            roughness={1}
            lightMapIntensity={2}
          />
        </mesh>

        <mesh position={[-2, 0, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 2, 1]} />
          <meshStandardMaterial color="#c08088" roughness={0.6} />
          <Body isStatic />
        </mesh>

        <mesh position={[2, 0, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 2, 1]} />
          <meshStandardMaterial color="#8080c8" roughness={0.6} />
          <Body isStatic />
        </mesh>

        <mesh position={[0, 2, 0.25]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#c8c880" roughness={0.9} />
          <Body />
        </mesh>
        <mesh position={[1, 2, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#80c880" roughness={0.9} />
          <Body />
        </mesh>

        <mesh position={[-1.5, 0, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial
            color="#000000"
            emissive={new THREE.Color('#ffff00')}
            emissiveIntensity={3}
          />
        </mesh>

        <pointLight
          position={[-12, 12, 4]}
          intensity={0.9}
          color="#f0f0ff"
          castShadow
        />
        <pointLight
          position={[4, -8, 4]}
          intensity={0.6}
          color="#fffff0"
          castShadow
        />
        <ambientLight color="#101010" />
      </group>
    </TopDownPhysics>
  );
};
