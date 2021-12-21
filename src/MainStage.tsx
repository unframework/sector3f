import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const MainStage: React.FC = () => {
  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#c0c0c8" roughness={0.6} />
      </mesh>

      <mesh position={[-2, 0, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#c08088" roughness={0.6} />
      </mesh>

      <mesh position={[2, 0, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 2, 1]} />
        <meshStandardMaterial color="#8080c8" roughness={0.6} />
      </mesh>

      <pointLight position={[-12, 12, 4]} intensity={0.9} color="#f0f0ff" />
      <pointLight
        position={[4, -8, 4]}
        intensity={0.6}
        color="#fffff0"
        castShadow
      />
      <ambientLight color="#101010" />
    </group>
  );
};
