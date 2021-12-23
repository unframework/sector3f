import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as b2 from '@flyover/box2d';
import WebFont from 'webfontloader';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lightmap } from '@react-three/lightmap';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { MainStage } from './MainStage';
import { useWASD } from './wasd';
import { g_debugDraw, g_camera } from './box2dDebugDraw';

import './index.css';

function createStepTimer(physicsStepDuration: number, onTick: () => void) {
  let lastTime = performance.now(),
    physicsStepAccumulator = 0;

  let isStopped = false;

  function update() {
    if (isStopped) {
      return;
    }

    const time = performance.now();
    const elapsed = Math.max(0, Math.min(0.1, (time - lastTime) / 1000));

    lastTime = time;

    physicsStepAccumulator += elapsed;

    while (physicsStepAccumulator > physicsStepDuration) {
      onTick();
      physicsStepAccumulator -= physicsStepDuration;
    }

    // restart
    requestAnimationFrame(update);
  }

  // kick off initial run in next RAF tick
  requestAnimationFrame(update);

  return {
    stop() {
      isStopped = true;
    }
  };
}

const STEP = 1 / 60;

const PhysicsMain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = container.childNodes[0] as HTMLCanvasElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    const world = new b2.World(new b2.Vec2(0, 0));

    const bodyDef = new b2.BodyDef();
    bodyDef.type = b2.dynamicBody;
    bodyDef.position.x = 0;
    bodyDef.position.y = 0;

    const fixDef = new b2.FixtureDef();
    const shape = (fixDef.shape = new b2.PolygonShape());
    fixDef.density = 5.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;
    shape.SetAsBox(2, 2);

    const baseBody = world.CreateBody(bodyDef);
    baseBody.CreateFixture(fixDef);

    g_camera.m_center.x = 0;
    g_camera.m_center.y = 0;
    g_camera.m_extent = 10;
    g_camera.m_width = canvas.width;
    g_camera.m_height = canvas.height;

    g_debugDraw.m_ctx = ctx;
    g_debugDraw.m_drawFlags = b2.DrawFlags.e_shapeBit;

    world.SetDebugDraw(g_debugDraw);

    const timer = createStepTimer(STEP, () => {
      world.Step(STEP, 3, 3);

      // debug draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(0.5 * canvas.width, 0.5 * canvas.height);
      ctx.scale(1, -1);

      const s: number = (0.5 * g_camera.m_height) / g_camera.m_extent;
      ctx.scale(s, s);
      ctx.lineWidth /= s;

      ctx.scale(1 / g_camera.m_zoom, 1 / g_camera.m_zoom);
      ctx.lineWidth *= g_camera.m_zoom;
      ctx.translate(-g_camera.m_center.x, -g_camera.m_center.y);

      world.DebugDraw();

      ctx.restore();
    });

    return () => {
      timer.stop();
    };
  }, []);

  return (
    <div className="physicsDebug" ref={containerRef}>
      <canvas />
    </div>
  );
};

const App: React.FC = () => {
  const [moveX, moveY] = useWASD();
  console.log('input', moveX, moveY);

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

      <PhysicsMain />
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
