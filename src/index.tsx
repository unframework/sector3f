import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Engine, Render, Bodies, Composite, Runner } from 'matter-js';
import WebFont from 'webfontloader';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lightmap } from '@react-three/lightmap';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { MainStage } from './MainStage';

import './index.css';

const MatterMain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const engine = Engine.create();

    // create two boxes and a ground
    const boxA = Bodies.rectangle(200, 120, 80, 80);
    const boxB = Bodies.rectangle(250, 20, 80, 80);
    const ground = Bodies.rectangle(240, 460, 460, 20, { isStatic: true });

    // add all of the bodies to the world
    Composite.add(engine.world, [boxA, boxB, ground]);

    // debug render
    const debugContainer = containerRef.current!;
    const render = Render.create({
      element: debugContainer,
      engine: engine,
      options: {
        width: debugContainer.offsetWidth,
        height: debugContainer.offsetHeight
      }
    });
    Render.run(render);

    // run the engine
    const runner = Runner.create();
    Runner.run(runner, engine);
  }, []);

  return <div className="matterDebug" ref={containerRef} />;
};

const App: React.FC = () => {
  return (
    <>
      <Canvas
        mode="legacy"
        shadows
        style={{ height: '100vh' }}
        gl={{
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,

          outputEncoding: THREE.sRGBEncoding
        }}
      >
        <PerspectiveCamera
          position={[0, -5, 4]}
          up={[0, 0, 1]}
          near={0.1}
          far={500}
          fov={45}
          makeDefault
        />
        <OrbitControls target={[0, 0, 0]} />

        <React.Suspense fallback={null}>
          <Lightmap>
            <MainStage />
          </Lightmap>
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

      <MatterMain />
    </>
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
