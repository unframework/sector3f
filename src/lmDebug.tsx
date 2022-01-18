import React, { useMemo, useContext, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { DebugContext } from '@react-three/lightmap';

// show provided textures as widgets on debug overlay (via createPortal)
export const DebugOverlayWidgets: React.FC = React.memo(() => {
  const { size } = useThree();
  const debugCamera = useMemo(() => {
    // top-left corner is (0, 100), top-right is (100, 100)
    const aspect = size.height / size.width;
    return new THREE.OrthographicCamera(0, 100, 100, 100 * (1 - aspect), -1, 1);
  }, [size]);

  const debugSceneRef = useRef<THREE.Scene>();

  useFrame(({ gl }) => {
    if (!debugSceneRef.current) {
      return;
    }

    gl.autoClear = false;
    gl.clearDepth();
    gl.render(debugSceneRef.current, debugCamera);
    gl.autoClear = true;
  }, 30);

  const debugInfo = useContext(DebugContext);

  if (!debugInfo) {
    return null;
  }

  const { atlasTexture, outputTexture } = debugInfo;

  return (
    // hide from main scene
    <group visible={false}>
      <scene name="Debug Overlay" ref={debugSceneRef}>
        {outputTexture && (
          <mesh position={[85, 85, 0]}>
            <planeBufferGeometry attach="geometry" args={[20, 20]} />
            <meshBasicMaterial
              attach="material"
              map={outputTexture as any}
              toneMapped={false}
            />
          </mesh>
        )}

        {atlasTexture && (
          <mesh position={[85, 64, 0]}>
            <planeBufferGeometry attach="geometry" args={[20, 20]} />
            <meshBasicMaterial
              attach="material"
              map={atlasTexture as any}
              toneMapped={false}
            />
          </mesh>
        )}
      </scene>
    </group>
  );
});
