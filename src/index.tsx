import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import WebFont from 'webfontloader';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

import { MainStage } from './MainStage';

import './index.css';

// @todo proper UI/etc
document.body.addEventListener('click', () => {
  document.body.requestPointerLock();
});

const App: React.FC = () => {
  return (
    <>
      <Canvas
        shadows
        style={{ height: '100vh' }}
        gl={{
          alpha: false
        }}
      >
        {/*
        <PerspectiveCamera
          position={[0, -5, 4]}
          up={[0, 0, 1]}
          near={0.1}
          far={500}
          fov={45}
          makeDefault
        />
        <OrbitControls target={[0, 0, 0]} />
        */}

        {/*<DebugTopDownPhysics />*/}

        <React.Suspense fallback={null}>
          <MainStage />
        </React.Suspense>

        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            height={300}
          />
        </EffectComposer>
      </Canvas>
    </>
  );
};

// render after resources are ready
// WebFont.load({
//   google: {
//     families: []
//   },

//   active: function() {
createRoot(document.getElementById('root')!).render(
  React.createElement(App)
);
//   }
// });
