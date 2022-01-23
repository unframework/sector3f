import React from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export const floorMaterialList = [
  'default',
  'rawConcrete',
  'elevatorTrim',
  'elevatorFloor'
];

// named CSG materials used across the board
// (centrally defined here to help consistency across sub-components)
export function useLevelMaterials() {
  // texture from https://opengameart.org/content/metalstone-textures by Spiney
  const concreteTexture = useLoader(
    THREE.TextureLoader,
    '/assets/opengameart/ft_conc01_c.png'
  );
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;
  concreteTexture.repeat.set(0.25, 0.25);

  const rawConcreteTexture = useLoader(
    THREE.TextureLoader,
    '/assets/opengameart/conc_base01_c_light.png'
  );
  rawConcreteTexture.wrapS = THREE.RepeatWrapping;
  rawConcreteTexture.wrapT = THREE.RepeatWrapping;
  rawConcreteTexture.repeat.set(0.125, 0.125);

  const blockWallTexture = useLoader(
    THREE.TextureLoader,
    '/assets/chilly/Tiles-Large.png'
  );
  blockWallTexture.wrapS = THREE.RepeatWrapping;
  blockWallTexture.wrapT = THREE.RepeatWrapping;
  blockWallTexture.repeat.set(0.5, 0.5);

  const floorTileTexture = useLoader(
    THREE.TextureLoader,
    '/assets/chilly/Floor-Tiles.png'
  );
  floorTileTexture.wrapS = THREE.RepeatWrapping;
  floorTileTexture.wrapT = THREE.RepeatWrapping;
  floorTileTexture.repeat.set(0.25, 0.25);

  const elevatorWallTexture = useLoader(
    THREE.TextureLoader,
    '/assets/sbs/Wood_07.png'
  );
  elevatorWallTexture.wrapS = THREE.RepeatWrapping;
  elevatorWallTexture.wrapT = THREE.RepeatWrapping;
  elevatorWallTexture.repeat.set(0.5, 0.5);

  return {
    default: <meshStandardMaterial map={concreteTexture} />,
    rawConcrete: <meshStandardMaterial map={rawConcreteTexture} />,
    blockWall: <meshStandardMaterial map={blockWallTexture} />,
    solidLight: (
      <meshStandardMaterial
        color="#f0f8ff"
        emissive={new THREE.Color('#f0f8ff')}
      />
    ),
    elevator: (
      <meshStandardMaterial color="#a0a0a0" map={elevatorWallTexture} />
    ),
    elevatorFloor: <meshStandardMaterial map={floorTileTexture} />,
    elevatorTrim: <meshStandardMaterial color="#404040" />
  };
}
