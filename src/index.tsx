import React from 'react';
import ReactDOM from 'react-dom';
import WebFont from 'webfontloader';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { MainStage } from './MainStage';

import './index.css';

const App: React.FC = () => {
  return (
    <Canvas
      style={{ height: '100vh' }}
      gl={{
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,

        outputEncoding: THREE.sRGBEncoding
      }}
    >
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
  );
};

// render after resources are ready
// WebFont.load({
//   google: {
//     families: []
//   },

//   active: function() {
ReactDOM.render(React.createElement(App), document.getElementById('root'));
//   }
// });
