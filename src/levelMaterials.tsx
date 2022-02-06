import React, { useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export const floorMaterialList = [
  'default',
  'rawConcrete',
  'carpet',
  'elevatorTrim',
  'elevatorFloor'
];

function useLevelMat(
  registry: Record<string, JSX.Element>,
  name: string,
  color: string,
  file: string,
  repeat: number,
  offset?: number
) {
  // texture from https://opengameart.org/content/metalstone-textures by Spiney
  const texture = useLoader(THREE.TextureLoader, file);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.offset.set(offset || 0, offset || 0);

  registry[name] = <meshStandardMaterial color={color} map={texture} />;
}

// named CSG materials used across the board
// (centrally defined here to help consistency across sub-components)
export function useLevelMaterials() {
  // initialize and use object once
  const registryRef = useRef<Record<string, JSX.Element>>({});
  const registry = registryRef.current;

  // texture from https://opengameart.org/content/metalstone-textures by Spiney
  useLevelMat(
    registry,
    'default',
    '#ffffff',
    'assets/opengameart/ft_conc01_c.png',
    0.25
  );

  useLevelMat(
    registry,
    'rawConcrete',
    '#a0a0a0',
    'assets/opengameart/conc_base01_c_light.png',
    0.125
  );

  useLevelMat(
    registry,
    'blockWall',
    '#c0c0c0',
    'assets/chilly/Tiles-Large.png',
    0.5
  );

  useLevelMat(
    registry,
    'roofSlat',
    '#ffffff',
    'assets/chilly/Roof-Tiles.png',
    0.5
  );

  useLevelMat(
    registry,
    'carpet',
    '#d0d0d0',
    'assets/chilly/Fabric-Cord.png',
    0.5
  );

  useLevelMat(registry, 'wallpaper', '#a0a0a0', 'assets/sbs/Metal_09.png', 0.5);

  useLevelMat(
    registry,
    'ceilingTile',
    '#e0f0f0',
    'assets/sbs/Tile_15_light.png',
    0.5,
    0.25
  );

  useLevelMat(registry, 'elevator', '#a0a0a0', 'assets/sbs/Wood_07.png', 0.5);

  useLevelMat(
    registry,
    'elevatorFloor',
    '#ffffff',
    'assets/chilly/Floor-Tiles.png',
    0.25
  );

  registry.solidLight = (
    <meshStandardMaterial
      color="#f0f8ff"
      emissive={new THREE.Color('#f0f8ff')}
    />
  );

  registry.elevatorTrim = <meshStandardMaterial color="#404040" />;

  return registry;
}
