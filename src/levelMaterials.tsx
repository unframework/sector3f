import React from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export const floorMaterialList = [
  'default',
  'rawConcrete',
  'carpet',
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

  const roofSlatTexture = useLoader(
    THREE.TextureLoader,
    '/assets/chilly/Roof-Tiles.png'
  );
  roofSlatTexture.wrapS = THREE.RepeatWrapping;
  roofSlatTexture.wrapT = THREE.RepeatWrapping;
  roofSlatTexture.repeat.set(0.5, 0.5);

  const carpetTexture = useLoader(
    THREE.TextureLoader,
    '/assets/chilly/Fabric-Cord.png'
  );
  carpetTexture.wrapS = THREE.RepeatWrapping;
  carpetTexture.wrapT = THREE.RepeatWrapping;
  carpetTexture.repeat.set(0.5, 0.5);

  const wallpaperTexture = useLoader(
    THREE.TextureLoader,
    '/assets/sbs/Metal_09.png'
  );
  wallpaperTexture.wrapS = THREE.RepeatWrapping;
  wallpaperTexture.wrapT = THREE.RepeatWrapping;
  wallpaperTexture.repeat.set(0.5, 0.5);

  const ceilingTileTexture = useLoader(
    THREE.TextureLoader,
    '/assets/sbs/Tile_15_light.png'
  );
  ceilingTileTexture.wrapS = THREE.RepeatWrapping;
  ceilingTileTexture.wrapT = THREE.RepeatWrapping;
  ceilingTileTexture.offset.set(0.25, 0.25);
  ceilingTileTexture.repeat.set(0.5, 0.5);

  const elevatorWallTexture = useLoader(
    THREE.TextureLoader,
    '/assets/sbs/Wood_07.png'
  );
  elevatorWallTexture.wrapS = THREE.RepeatWrapping;
  elevatorWallTexture.wrapT = THREE.RepeatWrapping;
  elevatorWallTexture.repeat.set(0.5, 0.5);

  return {
    default: <meshStandardMaterial map={concreteTexture} />,
    rawConcrete: (
      <meshStandardMaterial color="#a0a0a0" map={rawConcreteTexture} />
    ),
    blockWall: <meshStandardMaterial color="#c0c0c0" map={blockWallTexture} />,
    roofSlat: <meshStandardMaterial color="#ffffff" map={roofSlatTexture} />,
    carpet: <meshStandardMaterial color="#d0d0d0" map={carpetTexture} />,
    wallpaper: <meshStandardMaterial color="#a0a0a0" map={wallpaperTexture} />,
    ceilingTile: (
      <meshStandardMaterial color="#e0f0f0" map={ceilingTileTexture} />
    ),
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
